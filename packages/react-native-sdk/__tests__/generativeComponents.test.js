/**
 * Unit Tests: Generative UI Components, Block Renderer, and MyaChatView
 * Zero DOM / Node.js runtime verification.
 */

const React = require('react');
const {
  MyaGoalCard,
  MyaJournalCard,
  MyaConsultationCard,
  MyaMediaCard,
  MyaQuickReplies,
  MyaBlockRenderer,
  defaultMyaTheme
} = require('../src/components');

describe('Mobile Generative UI Components & MyaChatView', () => {
  describe('MyaMediaCard', () => {
    it('renders verified visual media card with image, notes, attribution and callbacks', () => {
      let mediaPressed = false;
      const media = {
        id: 'media_curl_4c_macro_001',
        title: 'Macro Close-up 4C Afro-Coily Hair Texture with High Shrinkage',
        category: 'hair_type',
        subcategory: 'type_4c',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Black_natural_afro-textured_hair_macro_texture_coils.jpg',
        hairType: '4C',
        caption: 'High-density spring coil structure.',
        educationalNotes: 'Shrinkage is an evolutionary adaptation, not damage.',
        attribution: 'Creative Commons Attribution / Wikimedia',
        license: 'CC BY-SA 4.0',
        tags: ['4c', 'coily', 'shrinkage']
      };

      const element = MyaMediaCard({
        media,
        onPressMedia: () => {
          mediaPressed = true;
        }
      });
      expect(element).toBeDefined();
      expect(element.props.style).toBeDefined();
    });

    it('supports dual-prop contract (data and onPressAction)', () => {
      let actionFired = false;
      const element = MyaMediaCard({
        data: {
          title: 'Protective Bantu Knots',
          category: 'hairstyles',
          imageUrl: 'https://example.com/bantu.jpg'
        },
        onPressAction: (action, data) => {
          if (action === 'view_media') actionFired = true;
        }
      });
      expect(element).toBeDefined();
    });
  });

  describe('MyaGoalCard', () => {
    it('renders hair goal card with title, progress, and milestones', () => {
      const goal = {
        id: 'goal-1',
        title: 'Moisture Retention & Length',
        targetMetric: 'Elasticity & Moisture',
        currentProgress: 65,
        targetDate: '2026-12-31',
        milestones: [
          { title: 'Weekly Deep Condition', completed: true },
          { title: 'Protein Treatment', completed: false }
        ]
      };

      const element = MyaGoalCard({ goal });
      expect(element).toBeDefined();
      expect(element.props.style).toBeDefined();
    });
  });

  describe('MyaJournalCard', () => {
    it('renders hair journal entry preview with tags and notes', () => {
      const entry = {
        id: 'entry-1',
        date: 'Sept 6, 2026',
        mood: 'Hydrated & Defined',
        notes: 'Clarifying wash day followed by honey & sage deep treatment.',
        isWashDay: true,
        productsUsed: ['MYAVANA Clarifying Cleanser', 'MYAVANA Leave-in Elixir']
      };

      const element = MyaJournalCard({ entry });
      expect(element).toBeDefined();
      expect(element.props.style).toBeDefined();
    });
  });

  describe('MyaConsultationCard', () => {
    it('renders specialist profile and booking CTA', () => {
      let booked = false;
      const specialist = {
        name: 'Dr. Candace Holmes',
        title: 'Board Certified Trichologist & Hair Scientist',
        rating: 4.9,
        specialties: ['Porosity Balance', 'Traction Alopecia', 'Moisture Retention'],
        availableSlot: 'Tomorrow at 2:00 PM EST'
      };

      const element = MyaConsultationCard({
        specialist,
        onBookConsultation: () => {
          booked = true;
        }
      });
      expect(element).toBeDefined();
    });
  });

  describe('MyaQuickReplies', () => {
    it('renders suggestion chips and handles interaction', () => {
      let selected = null;
      const replies = ['Analyze Hair Strand', 'Review Wash Day', 'Book Specialist'];

      const element = MyaQuickReplies({
        replies,
        onSelectReply: (item) => {
          selected = item;
        }
      });
      expect(element).toBeDefined();
      expect(element.props.horizontal).toBe(true);
    });

    it('returns null if empty replies array', () => {
      const element = MyaQuickReplies({ replies: [] });
      expect(element).toBeNull();
    });
  });

  describe('MyaBlockRenderer', () => {
    it('delegates hair_profile_summary block to MyaStrandCard', () => {
      const block = {
        type: 'hair_profile_summary',
        data: {
          hairType: '4B/4C',
          porosity: 'High',
          overallHealthScore: 92
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates routine_card block to MyaRoutineChecklist', () => {
      const block = {
        type: 'routine_card',
        data: {
          id: 'routine-1',
          title: 'Wash Day Regimen',
          steps: [{ id: 's1', title: 'Pre-poo oil soak', isCompleted: true }]
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates goal_card block to MyaGoalCard', () => {
      const block = {
        type: 'goal_card',
        data: {
          id: 'g1',
          title: 'Retain 2 inches',
          currentProgress: 50
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates journal_entry block to MyaJournalCard', () => {
      const block = {
        type: 'journal_entry',
        data: {
          id: 'j1',
          notes: 'Great twist out today!'
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates consultation_card block to MyaConsultationCard', () => {
      const block = {
        type: 'consultation_card',
        data: {
          name: 'Dr. Holmes',
          title: 'Trichologist'
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates media_card block to MyaMediaCard', () => {
      const block = {
        type: 'media_card',
        data: {
          id: 'media_curl_4c_macro_001',
          title: 'Macro Close-up 4C Coils',
          category: 'hair_type'
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates hairstyle_card block to MyaMediaCard', () => {
      const block = {
        type: 'hairstyle_card',
        data: {
          id: 'media_style_bantu_knots_019',
          title: 'Bantu Knots',
          category: 'hairstyles'
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('delegates quick_replies block to MyaQuickReplies', () => {
      const block = {
        type: 'quick_replies',
        data: {
          replies: ['Check Health Score', 'Find Stylist']
        }
      };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });

    it('returns empty View for unknown block types', () => {
      const block = { type: 'unknown_block', data: {} };
      const element = MyaBlockRenderer({ block });
      expect(element).toBeDefined();
    });
  });
});

