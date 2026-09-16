/** 案件卷宗封面：按 case_id / 来源匹配主题插画（与产品暗黑侦探风同源） */
const COVER_MAP: Record<string, string> = {
  preset: '/covers/case-academic.svg', // 消失的学术新星
  'case_1788706124166': '/covers/case-guest.svg', // 幸福之家的第31位住客
};

export function caseCover(caseId?: string, source?: string): string {
  if (caseId && COVER_MAP[caseId]) return COVER_MAP[caseId];
  if (source === 'custom') return '/covers/cover-custom.svg';
  if (source === 'hotlist') return '/covers/cover-hotlist.svg';
  return '/covers/cover-hotlist.svg';
}
