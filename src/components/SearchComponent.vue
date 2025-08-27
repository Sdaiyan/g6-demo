<template>
  <div class="search-container">
    <el-autocomplete
      v-model="searchQuery"
      :fetch-suggestions="querySearch"
      :placeholder="placeholder"
      :clearable="true"
      class="search-input"
      @select="handleSelect"
      @clear="handleClear"
      value-key="name"
      :highlight-first-item="true"
      :trigger-on-focus="false"
    >
      <template #prefix>
        <el-icon class="search-icon">
          <Search />
        </el-icon>
      </template>
      
      <template #default="{ item }">
        <div class="search-suggestion">
          <div class="suggestion-main">
            <div class="suggestion-name">{{ item.name }}</div>
            <div class="suggestion-desc">{{ item.description }}</div>
          </div>
          <div class="suggestion-meta">
            <el-tag size="small" :type="getLevelTagType(item.level)">
              L{{ item.level || 0 }}
            </el-tag>
          </div>
        </div>
      </template>
    </el-autocomplete>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElAutocomplete, ElIcon, ElTag } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { GraphSearcher } from '@/utils/searchUtils';
import type { NodeData, SearchResult, GraphData } from '@/types/graph';

// Props
interface Props {
  graphData: GraphData;
  placeholder?: string;
  maxResults?: number;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索节点...',
  maxResults: 10
});

// Emits
const emit = defineEmits<{
  nodeSelect: [nodeId: string];
  search: [query: string, results: SearchResult[]];
}>();

// 响应式数据
const searchQuery = ref('');
const searcher = ref<GraphSearcher>();

// 初始化搜索器
const initSearcher = () => {
  searcher.value = new GraphSearcher(props.graphData.nodes);
};

// 监听图数据变化
watch(() => props.graphData, () => {
  initSearcher();
}, { deep: true, immediate: true });

// 查询建议函数
const querySearch = (queryString: string, callback: (suggestions: NodeData[]) => void) => {
  if (!searcher.value || !queryString.trim()) {
    callback([]);
    return;
  }
  
  const results = searcher.value.search(queryString, props.maxResults);
  const nodeSuggestions = results.map(result => result.node);
  
  // 发送搜索事件
  emit('search', queryString, results);
  
  callback(nodeSuggestions);
};

// 处理选择
const handleSelect = (item: any) => {
  const nodeData = item as NodeData;
  emit('nodeSelect', nodeData.id);
};

// 处理清除
const handleClear = () => {
  searchQuery.value = '';
  emit('search', '', []);
};

// 获取层级标签类型
const getLevelTagType = (level: number): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  switch (level) {
    case 0: return 'danger';   // 根节点 - 红色
    case 1: return 'warning';  // 中间层 - 橙色
    case 2: return 'success';  // 叶子节点 - 绿色
    default: return 'info';    // 其他 - 蓝色
  }
};
</script>

<style scoped lang="scss">
.search-container {
  width: 100%;
  
  .search-input {
    width: 100%;
    
    :deep(.el-input__inner) {
      border-radius: 8px;
      border: 1px solid #dcdfe6;
      transition: all 0.3s;
      
      &:hover {
        border-color: #c0c4cc;
      }
      
      &:focus {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
  }
  
  .search-icon {
    color: #909399;
  }
}

.search-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  
  .suggestion-main {
    flex: 1;
    overflow: hidden;
    
    .suggestion-name {
      font-weight: 500;
      color: #303133;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .suggestion-desc {
      color: #909399;
      font-size: 12px;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  .suggestion-meta {
    margin-left: 12px;
    flex-shrink: 0;
  }
}

:deep(.el-autocomplete-suggestion) {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.el-autocomplete-suggestion__wrap) {
  max-height: 300px;
}
</style>