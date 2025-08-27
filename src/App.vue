<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElContainer, ElHeader, ElMain, ElButton, ElSpace, ElDivider } from 'element-plus';
import { Refresh, Download, Setting } from '@element-plus/icons-vue';
import GraphVisualization from './components/GraphVisualization.vue';
import NodeDetailPanel from './components/NodeDetailPanel.vue';
import SearchComponent from './components/SearchComponent.vue';
import { generateGraphData } from './utils/dataGenerator';
import type { NodeData, GraphData, GeneratorConfig } from './types/graph';

// 响应式数据
const graphData = ref<GraphData>({ nodes: [], edges: [] });
const selectedNode = ref<NodeData>();
const selectedNodeId = ref<string>();
const showDetailPanel = ref(false);
const graphRef = ref();

// 默认生成配置
const defaultConfig: GeneratorConfig = {
  edgeDensity: 0.2, // 降低跨层连接密度，保持清晰的层次结构
  attributeTypes: ['person', 'company', 'product', 'location'],
  locale: 'zh_CN',
  seed: 12345
};

// 计算容器尺寸
const containerWidth = computed(() => {
  return showDetailPanel.value ? window.innerWidth - 400 : window.innerWidth;
});

const containerHeight = computed(() => {
  return window.innerHeight - 120; // 减去头部高度
});

// 生成随机数据
const generateData = () => {
  try {
    const newData = generateGraphData(defaultConfig);
    graphData.value = newData;
    console.log('Generated graph data:', newData);
  } catch (error) {
    console.error('Failed to generate data:', error);
  }
};

// 重置视图
const resetView = () => {
  if (graphRef.value) {
    graphRef.value.resetView();
  }
};

// 处理节点点击
const handleNodeClick = (nodeid: string) => {
  const node = graphData.value.nodes.find(n => n.id === nodeid);
  if (node) {
    selectedNode.value = node;
    selectedNodeId.value = node.id;
    showDetailPanel.value = true;
  }
};

// 处理节点悬停
const handleNodeHover = (node: NodeData | null) => {
  // 可以在这里添加悬停效果
};

// 处理画布点击
const handleCanvasClick = () => {
  selectedNode.value = undefined;
  selectedNodeId.value = undefined;
  showDetailPanel.value = false;
};

// 处理搜索节点选择
const handleSearchNodeSelect = (nodeId: string) => {
  const node = graphData.value.nodes.find(n => n.id === nodeId);
  if (node) {
    selectedNode.value = node;
    selectedNodeId.value = nodeId;
    showDetailPanel.value = true;
    
    // 高亮节点
    if (graphRef.value) {
      graphRef.value.highlightNode(nodeId);
    }
  }
};

// 处理详情面板节点选择
const handleDetailNodeSelect = (nodeId: string) => {
  handleSearchNodeSelect(nodeId);
};

// 关闭详情面板
const handleDetailPanelClose = () => {
  showDetailPanel.value = false;
  selectedNode.value = undefined;
  selectedNodeId.value = undefined;
};

// 导出数据
const exportData = () => {
  const dataStr = JSON.stringify(graphData.value, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'graph-data.json';
  link.click();
  URL.revokeObjectURL(url);
};

// 组件挂载后生成初始数据
onMounted(() => {
  generateData();
});
</script>

<template>
  <div class="app-container">
    <ElContainer class="main-container">
      <!-- 头部工具栏 -->
      <ElHeader class="app-header">
        <div class="header-left">
          <h1 class="app-title">G6 网络图可视化系统</h1>
          <span class="app-subtitle">节点关系图演示 Demo</span>
        </div>
        
        <div class="header-center">
          <SearchComponent
            :graph-data="graphData"
            @node-select="handleSearchNodeSelect"
            placeholder="搜索节点名称..."
            class="search-box"
          />
        </div>
        
        <div class="header-right">
          <ElSpace>
            <ElButton 
              type="primary" 
              :icon="Refresh" 
              @click="generateData"
              size="default"
            >
              重新生成
            </ElButton>
            <ElButton 
              :icon="Download" 
              @click="exportData"
              size="default"
            >
              导出数据
            </ElButton>
            <ElButton 
              :icon="Setting" 
              @click="resetView"
              size="default"
            >
              重置视图
            </ElButton>
          </ElSpace>
        </div>
      </ElHeader>

      <!-- 主要内容区域 -->
      <ElMain class="app-main">
        <div class="graph-area">
          <GraphVisualization
            ref="graphRef"
            :data="graphData"
            :selected-node-id="selectedNodeId"
            :width="containerWidth"
            :height="containerHeight"
            @node-click="handleNodeClick"
            @node-hover="handleNodeHover"
            @canvas-click="handleCanvasClick"
          />
        </div>
        
        <!-- 节点详情面板 -->
        <NodeDetailPanel
          :node-data="selectedNode"
          :graph-data="graphData"
          :visible="showDetailPanel"
          @node-select="handleDetailNodeSelect"
          @close="handleDetailPanelClose"
        />
      </ElMain>
    </ElContainer>

    <!-- 状态信息 -->
    <div class="status-bar">
      <span>节点数: {{ graphData.nodes.length }}</span>
      <ElDivider direction="vertical" />
      <span>连接数: {{ graphData.edges.length }}</span>
      <ElDivider direction="vertical" />
      <span v-if="selectedNode">已选择: {{ selectedNode.name }}</span>
      <span v-else>点击节点查看详情</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-container {
  height: 100%;
}

.app-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  
  .header-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 300px;

    .app-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
      line-height: 1.2;
    }

    .app-subtitle {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
  }

  .header-center {
    flex: 1;
    max-width: 400px;
    margin: 0 24px;

    .search-box {
      width: 100%;
    }
  }

  .header-right {
    min-width: 300px;
    display: flex;
    justify-content: flex-end;
  }
}

.app-main {
  padding: 0;
  position: relative;
  overflow: hidden;

  .graph-area {
    width: 100%;
    height: 100%;
    position: relative;
  }
}

.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  padding: 0 24px;
  font-size: 12px;
  color: #666;
  z-index: 100;

  span {
    white-space: nowrap;
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .app-header {
    .header-left {
      min-width: 200px;
      
      .app-title {
        font-size: 18px;
      }
    }

    .header-center {
      max-width: 300px;
    }

    .header-right {
      min-width: 200px;

      :deep(.el-space) {
        gap: 8px !important;
      }

      :deep(.el-button) {
        padding: 8px 12px;
        font-size: 12px;
      }
    }
  }
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    height: auto;
    padding: 16px;
    gap: 16px;

    .header-left,
    .header-center,
    .header-right {
      width: 100%;
      min-width: auto;
      max-width: none;
      margin: 0;
    }

    .header-center {
      order: 3;
    }

    .header-right {
      order: 2;
      justify-content: center;
    }
  }

  .status-bar {
    flex-direction: column;
    height: auto;
    padding: 8px 16px;
    
    span {
      margin: 2px 0;
    }

    .el-divider {
      display: none;
    }
  }
}
</style>
