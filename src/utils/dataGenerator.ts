import { faker } from '@faker-js/faker/locale/zh_CN';
import { faker as fakerEn } from '@faker-js/faker/locale/en';
import type { NodeData, EdgeData, GraphData, GeneratorConfig, AttributeValue } from '@/types/graph';

// 设置本地化
let currentFaker = faker;

export const setupFakerLocale = (locale: string) => {
  if (locale === 'zh_CN') {
    currentFaker = faker;
  } else {
    currentFaker = fakerEn;
  }
};

// 生成不同类型的节点属性
const generatePersonAttributes = (): Record<string, AttributeValue> => ({
  email: currentFaker.internet.email(),
  phone: currentFaker.phone.number(),
  jobTitle: currentFaker.person.jobTitle(),
  company: currentFaker.company.name(),
  department: currentFaker.commerce.department(),
  address: currentFaker.location.streetAddress(),
  birthDate: currentFaker.date.birthdate(),
  salary: currentFaker.number.int({ min: 3000, max: 50000 }),
  active: currentFaker.datatype.boolean(),
  avatar: currentFaker.image.avatar(),
  skills: currentFaker.helpers.arrayElements([
    '项目管理', '团队协作', '数据分析', '产品设计', '技术开发', '市场营销'
  ], { min: 1, max: 3 }).join(', ')
});

const generateCompanyAttributes = (): Record<string, AttributeValue> => ({
  industry: currentFaker.company.buzzNoun(),
  founded: currentFaker.date.past({ years: 50 }),
  employees: currentFaker.number.int({ min: 10, max: 10000 }),
  revenue: currentFaker.number.int({ min: 100000, max: 100000000 }),
  website: currentFaker.internet.url(),
  headquarters: currentFaker.location.city(),
  description: currentFaker.company.catchPhrase(),
  status: currentFaker.helpers.arrayElement(['初创', '成长', '成熟', '转型']),
  tags: currentFaker.helpers.arrayElements([
    '科技', '金融', '教育', '医疗', '零售', '制造'
  ], { min: 1, max: 2 }).join(', ')
});

const generateProductAttributes = (): Record<string, AttributeValue> => ({
  price: currentFaker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
  category: currentFaker.commerce.department(),
  brand: currentFaker.company.name(),
  rating: currentFaker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  inStock: currentFaker.datatype.boolean(),
  releaseDate: currentFaker.date.recent(),
  color: currentFaker.color.human(),
  material: currentFaker.commerce.productMaterial(),
  weight: currentFaker.number.float({ min: 0.1, max: 10, fractionDigits: 1 }) + 'kg'
});

const generateLocationAttributes = (): Record<string, AttributeValue> => ({
  country: currentFaker.location.country(),
  city: currentFaker.location.city(),
  coordinates: `${currentFaker.location.latitude()}, ${currentFaker.location.longitude()}`,
  timezone: currentFaker.location.timeZone(),
  population: currentFaker.number.int({ min: 1000, max: 10000000 }),
  area: currentFaker.number.float({ min: 1, max: 1000, fractionDigits: 1 }) + 'km²',
  founded: currentFaker.date.past({ years: 500 }),
  climate: currentFaker.helpers.arrayElement(['热带', '温带', '寒带', '干旱', '湿润'])
});

// 根据类型生成节点数据
export const generateNodeByType = (
  id: string, 
  type: 'person' | 'company' | 'product' | 'location',
  level: number = 0
): NodeData => {
  let name: string;
  let description: string;
  let attributes: Record<string, AttributeValue>;

  switch (type) {
    case 'person':
      name = currentFaker.person.fullName();
      description = `${currentFaker.person.jobTitle()} - ${currentFaker.company.name()}`;
      attributes = generatePersonAttributes();
      break;
    case 'company':
      name = currentFaker.company.name();
      description = currentFaker.company.catchPhrase();
      attributes = generateCompanyAttributes();
      break;
    case 'product':
      name = currentFaker.commerce.productName();
      description = currentFaker.commerce.productDescription();
      attributes = generateProductAttributes();
      break;
    case 'location':
      name = currentFaker.location.city();
      description = `${currentFaker.location.state()}, ${currentFaker.location.country()}`;
      attributes = generateLocationAttributes();
      break;
    default:
      name = currentFaker.person.fullName();
      description = currentFaker.lorem.sentence();
      attributes = generatePersonAttributes();
  }

  // 根据层级调整节点样式
  const getNodeStyle = (level: number) => {
    const colors = ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452'];
    // 根据示例逻辑设置大小：根节点50，中间层30，叶子节点15
    let size: number;
    if (level === 0) {
      size = 50; // 根节点
    } else if (level === 1) {
      size = 30; // 中间层节点
    } else {
      size = 15; // 叶子节点（第2层及以上）
    }
    
    return {
      fill: colors[level % colors.length],
      stroke: '#666',
      lineWidth: 2,
      r: size
    };
  };

  return {
    id,
    name,
    description,
    attributes,
    level,
    style: getNodeStyle(level)
  };
};

// 生成随机节点集合
export const generateRandomNodes = (config: GeneratorConfig): NodeData[] => {
  const { attributeTypes, locale, seed } = config;
  
  // 设置随机种子
  if (seed !== undefined) {
    currentFaker.seed(seed);
  }
  
  // 设置本地化
  setupFakerLocale(locale);
  
  const nodes: NodeData[] = [];
  
  // 固定生成3层结构
  const levels = 3;
  
  // 第0层：生成1个根节点
  const rootNode = generateNodeByType('root_0', currentFaker.helpers.arrayElement(attributeTypes), 0);
  nodes.push(rootNode);
  
  // 第1层：生成3-5个中间节点
  const level1Count = currentFaker.number.int({ min: 10, max: 16 });
  for (let i = 0; i < level1Count; i++) {
    const nodeType = currentFaker.helpers.arrayElement(attributeTypes);
    const nodeId = `level1_${i}`;
    const node = generateNodeByType(nodeId, nodeType, 1);
    node.parentId = rootNode.id;
    nodes.push(node);
  }
  
  // 第2层：为每个第1层节点生成3-6个叶子节点
  const level1Nodes = nodes.filter(n => n.level === 1);
  level1Nodes.forEach((parentNode, parentIndex) => {
    const leafCount = currentFaker.number.int({ min: 1, max: 6 });
    for (let i = 0; i < leafCount; i++) {
      const nodeType = currentFaker.helpers.arrayElement(attributeTypes);
      const nodeId = `leaf_${parentIndex}_${i}`;
      const leafNode = generateNodeByType(nodeId, nodeType, 2);
      leafNode.parentId = parentNode.id;
      nodes.push(leafNode);
    }
  });
  
  // 添加调试信息
  console.log('Generated nodes structure:', {
    total: nodes.length,
    level0: nodes.filter(n => n.level === 0).length,
    level1: nodes.filter(n => n.level === 1).length,
    level2: nodes.filter(n => n.level === 2).length,
    nodesByLevel: {
      level0: nodes.filter(n => n.level === 0).map(n => n.id),
      level1: nodes.filter(n => n.level === 1).map(n => n.id),
      level2: nodes.filter(n => n.level === 2).map(n => n.id)
    }
  });
  
  return nodes;
};

// 生成随机连接
export const generateRandomEdges = (nodes: NodeData[], edgeDensity: number = 0.3): EdgeData[] => {
  const edges: EdgeData[] = [];
  const edgeSet = new Set<string>(); // 防止重复连接
  
  // 首先生成层级结构的边（父子关系）
  nodes.forEach(node => {
    if (node.parentId) {
      const edgeId = `${node.parentId}-${node.id}`;
      edges.push({
        id: edgeId,
        source: node.parentId,
        target: node.id,
        type: 'single',
        weight: 1,
        style: {
          stroke: '#666',
          lineWidth: 2
        }
      });
      edgeSet.add(edgeId);
    }
  });
  
  // 生成随机跨层级连接
  const maxRandomEdges = Math.floor(nodes.length * edgeDensity);
  let randomEdgeCount = 0;
  
  while (randomEdgeCount < maxRandomEdges) {
    const sourceNode = currentFaker.helpers.arrayElement(nodes);
    const targetNode = currentFaker.helpers.arrayElement(nodes);
    
    // 避免自连接和重复连接
    if (sourceNode.id !== targetNode.id) {
      const edgeId = `${sourceNode.id}-${targetNode.id}`;
      const reverseEdgeId = `${targetNode.id}-${sourceNode.id}`;
      
      if (!edgeSet.has(edgeId) && !edgeSet.has(reverseEdgeId)) {
        const edgeType = currentFaker.helpers.arrayElement(['single', 'double', 'weighted']);
        const weight = currentFaker.number.float({ min: 0.1, max: 1, fractionDigits: 1 });
        
        edges.push({
          id: edgeId,
          source: sourceNode.id,
          target: targetNode.id,
          type: edgeType,
          weight,
          label: edgeType === 'weighted' ? weight.toString() : undefined,
          style: {
            stroke: edgeType === 'weighted' ? '#F6BD16' : '#999',
            lineWidth: edgeType === 'weighted' ? 3 : 1,
            lineDash: edgeType === 'double' ? [5, 5] : undefined
          }
        });
        
        edgeSet.add(edgeId);
        randomEdgeCount++;
      }
    }
  }
  
  return edges;
};

// 数据验证函数
export const validateGraphData = (data: GraphData): boolean => {
  const { nodes, edges } = data;
  
  // 检查节点数据完整性
  for (const node of nodes) {
    if (!node.id || !node.name || !node.description) {
      console.error('Invalid node data:', node);
      return false;
    }
  }
  
  // 检查边的有效性
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      console.error('Invalid edge data:', edge);
      return false;
    }
  }
  
  return true;
};

// 生成完整的图数据
export const generateGraphData = (config: GeneratorConfig): GraphData => {
  const nodes = generateRandomNodes(config);
  const edges = generateRandomEdges(nodes, config.edgeDensity);
  
  const graphData = { nodes, edges };
  
  if (!validateGraphData(graphData)) {
    throw new Error('Generated graph data is invalid');
  }
  
  return graphData;
};
