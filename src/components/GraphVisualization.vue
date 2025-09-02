<template>
	<div class="graph-container">
		<div ref="graphContainer" class="graph-canvas"></div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Graph, NodeEvent, EdgeEvent, CanvasEvent } from '@antv/g6';
import type { NodeData, EdgeData, GraphData } from '@/types/graph';

// Props
interface Props {
	data: GraphData;
	selectedNodeId?: string;
	width?: number;
	height?: number;
}

const props = withDefaults(defineProps<Props>(), {
	width: 800,
	height: 600
});

// Emits
const emit = defineEmits<{
	nodeClick: [nodeid: string];
	nodeHover: [node: NodeData | null];
	canvasClick: [];
}>();

// Refs
const graphContainer = ref<HTMLDivElement>();
let graph: Graph | null = null;

// 转换数据格式以适配G6 v5
const convertDataForG6 = (data: GraphData) => {
	const result = {
		nodes: data.nodes.map(node => {
			const isLeaf = !data.nodes.some(n => n.parentId === node.id);
			return {
				id: node.id,
				data: {
					...node,
					size: node.style?.r || 20,
					isLeaf: isLeaf,
				}
			};
		}),
		edges: data.edges.map(edge => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			data: {
				...edge
			}
		}))
	};

	// 调试信息
	console.log('Converted data for G6:', {
		nodeCount: result.nodes.length,
		edgeCount: result.edges.length,
		nodes: result.nodes.slice(0, 3), // 显示前3个节点作为示例
	});

	return result;
};

// 初始化图
const initGraph = () => {
	if (!graphContainer.value) return;

	const convertedData = convertDataForG6(props.data);

	console.log('Initialized graph with data:', convertedData);

	graph = new Graph({
		container: graphContainer.value,
		width: props.width,
		height: props.height,
		data: convertedData,
		node: {
			style: {
				size: (d: any) => {
					return 50 - (d.data.level || 0) * 15;
				},
				fill: (d: any) => {
					const colors = ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452'];
					return colors[(d.data.level || 0) % colors.length];
				},
				stroke: (d: any) => {
					// 如果节点被选中，使用红色边框
					if (d.data.selected) {
						return '#f00';
					}
					const colors = ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452'];
					return colors[(d.data.level || 0) % colors.length];
				},
				lineWidth: (d: any) => {
					// 如果节点被选中，使用更粗的边框
					return d.data.selected ? 3 : 2;
				},
				labelText: (d: any) => d.data.name,
				labelFontSize: (d: any) => {
					return 12 - (d.data.level || 0) * 3;
				},
				labelWordWrap: true,
				labelMaxLines: 3,
				labelMaxWidth: 60,
				labelFill: '#333',
				labelPlacement: 'bottom',
			},
			state: {
				selected: {
					stroke: '#f00',
					lineWidth: 3,
				},
				hover: {
					stroke: '#ff7f00',
					lineWidth: 2,
				},
			},
		},
		edge: {
			state: {
				highlight: {
					stroke: '#D580FF',
				},
			},
			style: {
				stroke: (d: any) => {
					switch (d.data.type) {
						case 'weighted':
							return '#F6BD16';
						case 'double':
							return '#5AD8A6';
						default:
							return '#e2e2e2';
					}
				},
				lineWidth: (d: any) => {
					switch (d.data.type) {
						case 'weighted':
							return 3;
						case 'double':
							return 2;
						default:
							return 1;
					}
				},
				lineDash: (d: any) => d.data.type === 'double' ? [5, 5] : undefined,
				endArrow: true,
				endArrowSize: 8,
				labelText: (d: any) => d.data.label || '',
				labelFontSize: 10,
				labelFill: '#666',
			},
		},
		layout: {
			type: 'd3-force',
			link: {
				distance: (d: any) => {
					return 100 - (d.source.data.level || 0) * 25;
				},
				strength: (d: any) => {
					// 根据节点类型调整连接强度
					if (d.source.data.level === 1 || d.source.data.level === 2) {
						// 中间层节点的连接强度较高，保持结构紧密
						return 0.7;
					} else if (d.target.data.isLeaf) {
						// 到叶子节点的连接强度较低
						return 0.1;
					} else {
						// 其他连接的默认强度
						return 0.3;
					}
				},
			},
			manyBody: {
				strength: (d: any) => {
					// 根据节点类型调整斥力
					if (d.data.isLeaf) {
						// 叶子节点斥力较小，可以更紧密排列
						return -50;
					} else if (d.data.level === 0) {
						// 根节点斥力最大，保持中心位置
						return -200;
					} else {
						// 中间层节点斥力适中
						return -100;
					}
				},
			},
			center: {
				x: props.width / 2,
				y: props.height / 2,
			},
		},
		behaviors: [
			'drag-element-force',
			{
				type: 'hover-activate',
				enable: (event: any) => event.targetType === 'node',
				degree: 1, // 👈🏻 Activate relations.
				state: 'highlight',
				inactiveState: 'dim',
				onHover: (event: any) => {
					event.view.setCursor('pointer');
				},
				onHoverEnd: (event: any) => {
					event.view.setCursor('default');
				},
			},
			{
				key: 'fix-element-size',
				type: 'fix-element-size',
				enable: (event: any) => event.data.scale < 1,
				state: 'selected',
				reset: true,
			},
			{
				type: 'click-select',
				key: 'click-select-1',
				onClick: (event: any) => {
					emit('nodeClick', event.target.id);
				}
			},
			'zoom-canvas',
			'drag-canvas',
		],
	});

	// 绑定事件
	bindEvents();

	// 渲染图
	graph.render();
};

// 绑定图事件
const bindEvents = () => {
	if (!graph) return;
};

// 更新图数据
const updateGraphData = () => {
	if (!graph) return;

	// 检查数据是否有效
	if (!props.data || !props.data.nodes || props.data.nodes.length === 0) {
		console.log('No data to render');
		return;
	}

	try {
		const convertedData = convertDataForG6(props.data);
		console.log('Converting data for G6:', convertedData);
		graph.setData(convertedData);
		graph.render();
	} catch (error) {
		console.error('Failed to update graph data:', error);
	}
};

// 高亮指定节点
const highlightNode = (nodeId: string) => {
	if (!graph || !nodeId || !props.data || !props.data.nodes) return;

	try {
		// 清除所有选中状态
		props.data.nodes.forEach(node => {
			if (node.id) {
				graph!.setElementState(node.id, 'inactive');
			}
		});

		// 设置指定节点为选中状态
		graph.setElementState(nodeId, 'highlight');

		// 聚焦到该节点
		graph.focusElement(nodeId);
		console.log('Node highlighted successfully');
	} catch (error) {
		console.warn('Failed to highlight node:', nodeId, error);
	}
};

// 重置视图
const resetView = () => {
	if (!graph) return;
	graph.fitView();
};

// 获取图实例（用于外部调用）
const getGraphInstance = () => graph;

// 暴露方法给父组件
defineExpose({
	highlightNode,
	resetView,
	getGraphInstance
});

// 监听数据变化
watch(() => props.data, () => {
	nextTick(() => {
		updateGraphData();
	});
}, { deep: true });

// 监听选中节点变化
watch(() => props.selectedNodeId, (newId) => {
	if (newId) {
		highlightNode(newId);
	}
});

// 监听容器尺寸变化
watch([() => props.width, () => props.height], () => {
	if (graph) {
		graph.resize(props.width, props.height);
		graph.fitView();
	}
});

onMounted(() => {
	nextTick(() => {
		initGraph();
	});
});

onUnmounted(() => {
	if (graph) {
		graph.destroy();
		graph = null;
	}
});
</script>

<style scoped lang="scss">
.graph-container {
	width: 100%;
	height: 100%;
	position: relative;

	.graph-canvas {
		width: 100%;
		height: 100%;
	}
}
</style>
