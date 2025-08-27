import type { NodeData, SearchResult } from '@/types/graph';

// 搜索算法实现
export class GraphSearcher {
  private nodes: NodeData[] = [];
  private searchIndex: Map<string, NodeData[]> = new Map();

  constructor(nodes: NodeData[]) {
    this.nodes = nodes;
    this.buildSearchIndex();
  }

  // 构建搜索索引
  private buildSearchIndex(): void {
    this.searchIndex.clear();
    
    this.nodes.forEach(node => {
      // 为节点名称建立索引
      const words = this.extractWords(node.name);
      words.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, []);
        }
        this.searchIndex.get(word)!.push(node);
      });

      // 为描述建立索引
      const descWords = this.extractWords(node.description);
      descWords.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, []);
        }
        if (!this.searchIndex.get(word)!.includes(node)) {
          this.searchIndex.get(word)!.push(node);
        }
      });

      // 为属性值建立索引
      Object.values(node.attributes).forEach(value => {
        if (typeof value === 'string') {
          const attrWords = this.extractWords(value);
          attrWords.forEach(word => {
            if (!this.searchIndex.has(word)) {
              this.searchIndex.set(word, []);
            }
            if (!this.searchIndex.get(word)!.includes(node)) {
              this.searchIndex.get(word)!.push(node);
            }
          });
        }
      });
    });
  }

  // 提取搜索关键词
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s]/g, ' ') // 保留中文字符
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  // 计算搜索相似度
  private calculateScore(node: NodeData, query: string): number {
    const queryWords = this.extractWords(query);
    let score = 0;

    // 名称匹配得分最高
    const nameWords = this.extractWords(node.name);
    queryWords.forEach(queryWord => {
      nameWords.forEach(nameWord => {
        if (nameWord.includes(queryWord) || queryWord.includes(nameWord)) {
          score += nameWord === queryWord ? 10 : 5; // 完全匹配得分更高
        }
      });
    });

    // 描述匹配得分中等
    const descWords = this.extractWords(node.description);
    queryWords.forEach(queryWord => {
      descWords.forEach(descWord => {
        if (descWord.includes(queryWord) || queryWord.includes(descWord)) {
          score += descWord === queryWord ? 3 : 1;
        }
      });
    });

    // 属性匹配得分较低
    Object.values(node.attributes).forEach(value => {
      if (typeof value === 'string') {
        const attrWords = this.extractWords(value);
        queryWords.forEach(queryWord => {
          attrWords.forEach(attrWord => {
            if (attrWord.includes(queryWord) || queryWord.includes(attrWord)) {
              score += attrWord === queryWord ? 2 : 0.5;
            }
          });
        });
      }
    });

    return score;
  }

  // 执行搜索
  search(query: string, limit: number = 10): SearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const results: SearchResult[] = [];
    const queryWords = this.extractWords(query);
    const candidateNodes = new Set<NodeData>();

    // 通过索引快速找到候选节点
    queryWords.forEach(word => {
      this.searchIndex.forEach((nodes, indexWord) => {
        if (indexWord.includes(word) || word.includes(indexWord)) {
          nodes.forEach(node => candidateNodes.add(node));
        }
      });
    });

    // 计算每个候选节点的得分
    candidateNodes.forEach(node => {
      const score = this.calculateScore(node, query);
      if (score > 0) {
        results.push({ node, score });
      }
    });

    // 按得分排序并返回前N个结果
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 获取自动补全建议
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim()) {
      return [];
    }

    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    // 从节点名称中提取建议
    this.nodes.forEach(node => {
      if (node.name.toLowerCase().includes(queryLower)) {
        suggestions.add(node.name);
      }
    });

    // 从索引键中提取建议
    this.searchIndex.forEach((_, word) => {
      if (word.includes(queryLower) && word.length > queryLower.length) {
        // 找到包含这个词的节点名称
        const nodes = this.searchIndex.get(word) || [];
        nodes.forEach(node => {
          if (node.name.toLowerCase().includes(word)) {
            suggestions.add(node.name);
          }
        });
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  // 更新搜索数据
  updateNodes(nodes: NodeData[]): void {
    this.nodes = nodes;
    this.buildSearchIndex();
  }

  // 根据ID查找节点
  getNodeById(id: string): NodeData | undefined {
    return this.nodes.find(node => node.id === id);
  }
}
