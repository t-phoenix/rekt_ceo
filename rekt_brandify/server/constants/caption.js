export const HUMOR_TAGS = [
  'sarcasm',
  'casual_roast',
  'savage_roast',
  'self_deprecation',
  'absurdist',
  'deadpan',
  'reversal',
  'callback',
  'wholesome_twist',
  'observational',
  'inside_baseball',
];

export const INTENSITY_LEVELS = ['mild', 'medium', 'savage'];

export const CONTEXT_TYPES = ['topic', 'tweet', 'headline', 'quote', 'auto'];

export const AUDIENCE_TYPES = ['ct', 'normie', 'mixed'];

export const JUDGE_WEIGHTS = {
  template_fit: 0.25,
  context_relevance: 0.2,
  surprise: 0.2,
  relatability: 0.15,
  brevity: 0.1,
  originality: 0.1,
};

export const CAPTION_COUNT = 10;
export const TOP_N = 3;
export const MAX_CONTEXT_LENGTH = 2000;
export const MAX_HUMOR_PALETTE = 4;
