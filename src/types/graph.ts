// 图形数据类型定义

export type AttributeValue = string | number | boolean | Date;

export interface NodeAttribute {
  key: string;
  value: AttributeValue;
  type: 'string' | 'number' | 'boolean' | 'date';
  label: string;
}

export interface NodeData {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, AttributeValue>;
  x?: number;
  y?: number;
  level?: number;
  parentId?: string;
  style?: {
    fill?: string;
    stroke?: string;
    lineWidth?: number;
    r?: number;
  };
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  type?: 'single' | 'double' | 'weighted';
  style?: {
    stroke?: string;
    lineWidth?: number;
    lineDash?: number[];
  };
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

export interface SearchResult {
  node: NodeData;
  score: number;
}

export interface GeneratorConfig {
  edgeDensity: number; // 0-1 之间，表示连接密度（用于生成额外的跨层连接）
  attributeTypes: Array<'person' | 'company' | 'product' | 'location'>;
  locale: 'zh_CN' | 'en_US';
  seed?: number;
}
