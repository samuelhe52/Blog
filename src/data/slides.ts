// Slide decks served as static HTML from public/slides/<slug>/.
// Each language version has its own deck file and a cover image of its first slide.

export type Lang = 'zh-CN' | 'en';

export interface DeckVersion {
  title: string;
  description: string;
  href: string;
  cover: string;
}

export interface Deck {
  slug: string;
  kind: 'paper';
  date: Date;
  slideCount: number;
  source?: { label: string; url: string };
  versions: Partial<Record<Lang, DeckVersion>>;
}

export const DECKS: Deck[] = [
  {
    slug: 'sdft-overview',
    kind: 'paper',
    date: new Date('2026-10-08'),
    slideCount: 20,
    source: { label: 'arXiv 2601.19897', url: 'https://arxiv.org/abs/2601.19897v2' },
    versions: {
      en: {
        title: 'Self-Distillation Enables Continual Learning (SDFT)',
        description:
          'How a model can teach itself from demonstrations on-policy, why it forgets less than SFT, and where the theory and the training loss part ways.',
        href: '/slides/sdft-overview/en/',
        cover: '/slides/sdft-overview/cover-en.webp',
      },
      'zh-CN': {
        title: 'Self-Distillation Enables Continual Learning（SDFT）',
        description: '模型如何借助示范在 on-policy 数据上自我蒸馏，为什么它比 SFT 遗忘更少，以及理论与实际训练损失之间的差距。',
        href: '/slides/sdft-overview/zh/',
        cover: '/slides/sdft-overview/cover-zh.webp',
      },
    },
  },
];

export const sortedDecks = () => [...DECKS].sort((a, b) => b.date.getTime() - a.date.getTime());
