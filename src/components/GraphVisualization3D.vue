<template>
    <div class="graph-container-3d">
        <div ref="graphContainer" class="graph-canvas-3d"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { CameraSetting, ExtensionCategory, Graph, register, NodeEvent, EdgeEvent, CanvasEvent } from '@antv/g6';
import { D3Force3DLayout, Light, Line3D, ObserveCanvas3D, Sphere, ZoomCanvas3D, renderer } from '@antv/g6-extension-3d';
import type { NodeData, EdgeData, GraphData } from '@/types/graph';

// 注册3D扩展
register(ExtensionCategory.PLUGIN, '3d-light', Light);
register(ExtensionCategory.NODE, 'sphere', Sphere);
register(ExtensionCategory.EDGE, 'line3d', Line3D);
register(ExtensionCategory.LAYOUT, 'd3-force-3d', D3Force3DLayout);
register(ExtensionCategory.PLUGIN, 'camera-setting', CameraSetting);
register(ExtensionCategory.BEHAVIOR, 'zoom-canvas-3d', ZoomCanvas3D);
register(ExtensionCategory.BEHAVIOR, 'observe-canvas-3d', ObserveCanvas3D);

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
    nodeClick: [node: NodeData];
    nodeHover: [node: NodeData | null];
    canvasClick: [];
}>();

// Refs
const graphContainer = ref<HTMLDivElement>();
let graph: Graph | null = null;

// 转换数据格式以适配G6 3D
const convertDataForG6_3D = (data: GraphData) => {
    const result = {
        nodes: data.nodes.map(node => {
            const isLeaf = !data.nodes.some(n => n.parentId === node.id);
            return {
                id: node.id,
                data: {
                    ...node,
                    group: node.level || 0, // 用于调色板分组
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

    return result;
};

// 初始化3D图
const initGraph = () => {
    if (!graphContainer.value) return;

    const convertedData = convertDataForG6_3D(props.data);

    graph = new Graph({
        container: graphContainer.value,
        renderer,
        width: props.width,
        height: props.height,
        data: convertedData,
        layout: {
            type: 'd3-force-3d',
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
        },
        node: {
            type: 'sphere',
            style: {
                materialType: 'phong',
                labelText: (d) => {
                    return d.data.name
                },
                labelFill: '#fff',
            },
            palette: {
                color: 'tableau',
                type: 'group',
                field: 'group',
            },
        },
        edge: {
            type: 'line3d',
        },
        behaviors: [
			{
				type: 'hover-activate',
				enable: (event: any) => {
                    return event.targetType === 'node';
                },
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
				type: 'click-select',
				key: 'click-select-1',
				onClick: (event: any) => {
					emit('nodeClick', event.target.id);
				}
			},
            'observe-canvas-3d',
            'zoom-canvas-3d'
        ],
        plugins: [
            {
                type: '3d-light',
                directional: {
                    direction: [0, 0, 1],
                },
            },
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

    // 节点点击事件
    graph.on(NodeEvent.CLICK, (evt: any) => {
        const { target } = evt;
        const nodeId = target.id;
        const nodeData = props.data.nodes.find(n => n.id === nodeId);
        if (nodeData) {
            emit('nodeClick', nodeData);
            highlightNode(nodeId);
        }
    });

    // 节点悬停事件
    graph.on(NodeEvent.POINTER_ENTER, (evt: any) => {
        const { target } = evt;
        const nodeId = target.id;
        const nodeData = props.data.nodes.find(n => n.id === nodeId);
        if (nodeData && nodeId) {
            emit('nodeHover', nodeData);
            try {
                graph!.setElementState(nodeId, 'hover');
            } catch (error) {
                console.warn('Failed to set hover state:', error);
            }
        }
    });

    graph.on(NodeEvent.POINTER_LEAVE, (evt: any) => {
        const { target } = evt;
        const nodeId = target.id;
        if (nodeId) {
            try {
                graph!.setElementState(nodeId, 'hover', false);
            } catch (error) {
                console.warn('Failed to clear hover state:', error);
            }
        }
        emit('nodeHover', null);
    });

    // 画布点击事件
    graph.on(CanvasEvent.CLICK, () => {
        // 清除所有选中状态
        props.data.nodes.forEach(node => {
            if (node.id) {
                try {
                    graph!.setElementState(node.id, 'selected', false);
                } catch (error) {
                    console.warn('Failed to clear selection state:', error);
                }
            }
        });
        emit('canvasClick');
    });
};

// 更新图数据
const updateGraphData = () => {
    if (!graph) return;

    if (!props.data || !props.data.nodes || props.data.nodes.length === 0) {
        return;
    }

    try {
        const convertedData = convertDataForG6_3D(props.data);
        graph.setData(convertedData);
        graph.render();
    } catch (error) {
        console.error('Failed to update 3D graph data:', error);
    }
};

// 高亮指定节点
const highlightNode = (nodeId: string) => {
    if (!graph || !nodeId || !props.data || !props.data.nodes) return;

    try {
        // 清除所有选中状态
        props.data.nodes.forEach(node => {
            if (node.id) {
                graph!.setElementState(node.id, 'selected', false);
            }
        });

        // 设置指定节点为选中状态
        graph.setElementState(nodeId, 'selected');

        // 聚焦到该节点
        graph.focusElement(nodeId);
    } catch (error) {
        console.warn('Failed to highlight 3D node:', nodeId, error);
    }
};

// 重置视图
const resetView = () => {
    if (!graph) return;
    graph.fitView();
};

// 获取图实例
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
.graph-container-3d {
    width: 100%;
    height: 100%;
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    .graph-canvas-3d {
        width: 100%;
        height: 100%;
        border-radius: 8px;
    }
}
</style>
