export interface SeedUser {
  userId: string;
  displayName: string;
  fingerprint: {
    dimensions: {
      name: string;
      score: number;
      toward: string;
      evidence: string;
    }[];
    detective_profile: {
      strength: string[];
      weakness: string[];
      style: string;
    };
    summary: string;
    keywords: string[];
  };
}

export const seedUsers: Record<string, SeedUser> = {
  'tech_blogger': {
    userId: 'tech_blogger',
    displayName: '技术博主',
    fingerprint: {
      dimensions: [
        { name: '逻辑-感性', score: 2.5, toward: '强逻辑型', evidence: '回答中大量使用因果论证和数据支撑' },
        { name: '宏观-微观', score: 7.5, toward: '偏微观型', evidence: '擅长深入代码细节和底层原理' },
        { name: '理论-实践', score: 3.0, toward: '偏理论型', evidence: '多用理论框架和原理推导' },
        { name: '乐观-批判', score: 7.0, toward: '偏批判型', evidence: '常指出技术方案的不足和风险' },
        { name: '深度-广度', score: 3.5, toward: '偏深度型', evidence: '集中于编程领域深度讨论' },
      ],
      detective_profile: {
        strength: ['推理链构建', '细节捕捉'],
        weakness: ['人心洞察', '跨界关联'],
        style: '理性分析型侦探，擅长逻辑推理和细节排查，但不善于从情感角度解读NPC行为',
      },
      summary: '典型的技术型思维者——逻辑严密、注重细节、批判性强。擅长从数据和代码中发现线索，但可能忽视人际关系的情感维度。',
      keywords: ['逻辑', '微观', '批判', '深度'],
    },
  },
  'humanities_writer': {
    userId: 'humanities_writer',
    displayName: '人文作者',
    fingerprint: {
      dimensions: [
        { name: '逻辑-感性', score: 8.0, toward: '强感性型', evidence: '回答以叙事和情感表达为主' },
        { name: '宏观-微观', score: 2.5, toward: '强宏观型', evidence: '偏好从历史和社会大框架讨论问题' },
        { name: '理论-实践', score: 7.0, toward: '偏实践型', evidence: '多用个人经历和社会观察' },
        { name: '乐观-批判', score: 3.5, toward: '偏乐观型', evidence: '整体基调积极向上' },
        { name: '深度-广度', score: 8.0, toward: '偏广度型', evidence: '跨哲学、历史、文学多领域涉猎' },
      ],
      detective_profile: {
        strength: ['人心洞察', '跨界关联'],
        weakness: ['推理链构建', '细节捕捉'],
        style: '感性直觉型侦探，擅长从情感和宏观视角发现线索，但逻辑推理和细节排查是弱项',
      },
      summary: '典型的人文型思维者——感性丰富、视野开阔、善于共情。能从NPC的情绪和宏观背景中发现线索，但可能忽视逻辑细节。',
      keywords: ['感性', '宏观', '乐观', '广度'],
    },
  },
  'business_analyst': {
    userId: 'business_analyst',
    displayName: '商业分析师',
    fingerprint: {
      dimensions: [
        { name: '逻辑-感性', score: 3.5, toward: '偏逻辑型', evidence: '回答偏理性分析' },
        { name: '宏观-微观', score: 6.0, toward: '均衡', evidence: '既能看大局也能深入数据' },
        { name: '理论-实践', score: 7.5, toward: '偏实践型', evidence: '大量引用行业案例' },
        { name: '乐观-批判', score: 5.0, toward: '均衡', evidence: '客观平衡' },
        { name: '深度-广度', score: 7.0, toward: '偏广度型', evidence: '跨行业分析' },
      ],
      detective_profile: {
        strength: ['关联发现', '审讯技巧'],
        weakness: ['深度分析', '人心洞察'],
        style: '实用主义侦探，擅长连接跨领域线索和从NPC口中套话，但在深度分析和情感洞察上有盲区',
      },
      summary: '典型的商业型思维者——理性务实、善于关联不同领域信息。擅长跨领域线索连接和NPC审讯，但深层情感分析和单一领域深挖可能不足。',
      keywords: ['逻辑', '实践', '广度', '均衡'],
    },
  },
};

export default seedUsers;
