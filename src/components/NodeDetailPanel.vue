<template>
  <div class="detail-panel" :class="{ 'panel-visible': visible }">
    <div class="panel-header">
      <h3>{{ nodeData?.name || '节点详情' }}</h3>
      <el-button 
        type="text" 
        size="small" 
        @click="closePanel"
        class="close-btn"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="panel-content" v-if="nodeData">
      <!-- 基本信息 -->
      <div class="info-section">
        <h4>基本信息</h4>
        <div class="info-item">
          <span class="label">ID:</span>
          <span class="value">{{ nodeData.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">名称:</span>
          <span class="value">{{ nodeData.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">描述:</span>
          <span class="value">{{ nodeData.description }}</span>
        </div>
        <div class="info-item" v-if="nodeData.level !== undefined">
          <span class="label">层级:</span>
          <span class="value">{{ nodeData.level }}</span>
        </div>
        <div class="info-item" v-if="nodeData.parentId">
          <span class="label">父节点:</span>
          <span class="value clickable" @click="selectParentNode">{{ getParentNodeName() }}</span>
        </div>
      </div>

      <!-- 自定义属性 -->
      <div class="info-section" v-if="Object.keys(nodeData.attributes).length > 0">
        <h4>自定义属性</h4>
        <div 
          class="info-item" 
          v-for="[key, value] in Object.entries(nodeData.attributes)" 
          :key="key"
        >
          <span class="label">{{ formatAttributeKey(key) }}:</span>
          <span class="value" :class="getAttributeClass(value)">
            {{ formatAttributeValue(value) }}
          </span>
        </div>
      </div>

      <!-- 关联节点 -->
      <div class="info-section" v-if="relatedNodes.length > 0">
        <h4>关联节点 ({{ relatedNodes.length }})</h4>
        <div class="related-nodes">
          <div 
            class="related-node" 
            v-for="relatedNode in relatedNodes" 
            :key="relatedNode.node.id"
            @click="selectRelatedNode(relatedNode.node)"
          >
            <div class="node-info">
              <div class="node-name">{{ relatedNode.node.name }}</div>
              <div class="node-relation">{{ relatedNode.relation }}</div>
            </div>
            <div class="node-level">L{{ relatedNode.node.level || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- 子节点 -->
      <div class="info-section" v-if="childNodes.length > 0">
        <h4>子节点 ({{ childNodes.length }})</h4>
        <div class="child-nodes">
          <div 
            class="child-node" 
            v-for="child in childNodes" 
            :key="child.id"
            @click="selectChildNode(child)"
          >
            <div class="node-info">
              <div class="node-name">{{ child.name }}</div>
              <div class="node-desc">{{ child.description }}</div>
            </div>
            <div class="node-level">L{{ child.level || 0 }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-placeholder" v-else>
      <el-empty description="请选择一个节点查看详情" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElButton, ElIcon, ElEmpty } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
import type { NodeData, EdgeData, GraphData } from '@/types/graph';

// Props
interface Props {
  nodeData?: NodeData;
  graphData: GraphData;
  visible: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  nodeSelect: [nodeId: string];
  close: [];
}>();

// 计算关联节点
const relatedNodes = computed(() => {
  if (!props.nodeData) return [];

  const relations: Array<{ node: NodeData; relation: string }> = [];
  
  props.graphData.edges.forEach(edge => {
    if (edge.source === props.nodeData!.id) {
      const targetNode = props.graphData.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        relations.push({
          node: targetNode,
          relation: edge.label || getRelationLabel(edge, 'target')
        });
      }
    } else if (edge.target === props.nodeData!.id) {
      const sourceNode = props.graphData.nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        relations.push({
          node: sourceNode,
          relation: edge.label || getRelationLabel(edge, 'source')
        });
      }
    }
  });

  return relations;
});

// 计算子节点
const childNodes = computed(() => {
  if (!props.nodeData) return [];
  
  return props.graphData.nodes.filter(node => node.parentId === props.nodeData!.id);
});

// 获取关系标签
const getRelationLabel = (edge: EdgeData, direction: 'source' | 'target'): string => {
  const typeMap = {
    'single': direction === 'target' ? '指向' : '被指向',
    'double': '双向关联',
    'weighted': `权重关联 (${edge.weight || 1})`
  };
  
  return typeMap[edge.type || 'single'] || '关联';
};

// 获取父节点名称
const getParentNodeName = (): string => {
  if (!props.nodeData?.parentId) return '';
  
  const parentNode = props.graphData.nodes.find(n => n.id === props.nodeData!.parentId);
  return parentNode?.name || props.nodeData.parentId;
};

// 格式化属性键名
const formatAttributeKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    'email': '邮箱',
    'phone': '电话',
    'jobTitle': '职位',
    'company': '公司',
    'department': '部门',
    'address': '地址',
    'birthDate': '生日',
    'salary': '薪资',
    'active': '状态',
    'avatar': '头像',
    'skills': '技能',
    'industry': '行业',
    'founded': '成立时间',
    'employees': '员工数',
    'revenue': '营收',
    'website': '网站',
    'headquarters': '总部',
    'status': '状态',
    'tags': '标签',
    'price': '价格',
    'category': '分类',
    'brand': '品牌',
    'rating': '评分',
    'inStock': '库存状态',
    'releaseDate': '发布日期',
    'color': '颜色',
    'material': '材质',
    'weight': '重量',
    'country': '国家',
    'city': '城市',
    'coordinates': '坐标',
    'timezone': '时区',
    'population': '人口',
    'area': '面积',
    'climate': '气候'
  };
  
  return keyMap[key] || key;
};

// 格式化属性值
const formatAttributeValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  
  if (typeof value === 'number') {
    // 如果是工资或价格，格式化为货币
    if (value > 1000 && value % 1 === 0) {
      return value.toLocaleString();
    }
    return value.toString();
  }
  
  return String(value);
};

// 获取属性值的样式类
const getAttributeClass = (value: any): string => {
  if (typeof value === 'boolean') {
    return value ? 'status-active' : 'status-inactive';
  }
  
  if (typeof value === 'number' && value > 1000) {
    return 'number-large';
  }
  
  return '';
};

// 选择父节点
const selectParentNode = () => {
  if (props.nodeData?.parentId) {
    emit('nodeSelect', props.nodeData.parentId);
  }
};

// 选择关联节点
const selectRelatedNode = (node: NodeData) => {
  emit('nodeSelect', node.id);
};

// 选择子节点
const selectChildNode = (node: NodeData) => {
  emit('nodeSelect', node.id);
};

// 关闭面板
const closePanel = () => {
  emit('close');
};
</script>

<style scoped lang="scss">
.detail-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transition: right 0.3s ease;
  overflow-y: auto;

  &.panel-visible {
    right: 0;
  }

  .panel-header {
    padding: 20px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;

    h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
      font-weight: 500;
    }

    .close-btn {
      padding: 4px;
      color: #666;
      
      &:hover {
        color: #333;
        background: #f0f0f0;
      }
    }
  }

  .panel-content {
    padding: 0;
  }

  .panel-placeholder {
    padding: 60px 20px;
    text-align: center;
  }

  .info-section {
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    h4 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }

      .label {
        font-weight: 500;
        color: #666;
        min-width: 80px;
        flex-shrink: 0;
      }

      .value {
        color: #333;
        text-align: right;
        word-break: break-all;
        flex: 1;
        margin-left: 16px;

        &.clickable {
          color: #1890ff;
          cursor: pointer;
          
          &:hover {
            text-decoration: underline;
          }
        }

        &.status-active {
          color: #52c41a;
          font-weight: 500;
        }

        &.status-inactive {
          color: #ff4d4f;
        }

        &.number-large {
          color: #1890ff;
          font-weight: 500;
        }
      }
    }
  }

  .related-nodes,
  .child-nodes {
    .related-node,
    .child-node {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background: #fafafa;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f0f9ff;
        transform: translateX(4px);
      }

      &:last-child {
        margin-bottom: 0;
      }

      .node-info {
        flex: 1;

        .node-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .node-relation,
        .node-desc {
          font-size: 12px;
          color: #666;
        }
      }

      .node-level {
        font-size: 12px;
        color: #1890ff;
        background: #e6f7ff;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
      }
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-panel {
    width: 100vw;
    right: -100vw;

    &.panel-visible {
      right: 0;
    }
  }
}
</style>
