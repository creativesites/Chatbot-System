/**
 * The first five Mya rich components, plus the families adopted from the
 * existing isolated cards.
 *
 * Every one of these is keyed to a BlockType the backend already emits, and
 * every one is tolerant of a partial payload — a card with a missing field
 * should render less, never crash the thread.
 */

import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { moderateScale } from '../scale';
import { MyaColors, MyaType, MyaFonts, MyaRadii } from '../myaTheme';
import {
  CardShell,
  CardTitle,
  CardBody,
  CardCta,
  CardActions,
  Meter,
  StepRow,
  Divider,
} from './primitives';
import { useMyaStorage, checklistKey, loadChecked, saveChecked } from '../checklistStore';

const arr = (v) => (Array.isArray(v) ? v : []);

/* ------------------------------------------------------------------ ROUTINE */

export function MyaRoutineCard({ data = {}, actions, onAction }) {
  const steps = arr(data.steps).length ? arr(data.steps) : arr(data.items);
  const title = data.title || 'Your routine';

  // Interactive step completion tracking inside chat
  const [completedSteps, setCompletedSteps] = React.useState(() => {
    const initial = new Set();
    steps.forEach((s, i) => {
      if (typeof s === 'object' && (s.isCompleted || s.completed)) {
        initial.add(s.id || `step-${i}`);
      }
    });
    return initial;
  });

  // Ticks survive closing the app, but belong to the day they were made.
  const storage = useMyaStorage();
  const routineKey = checklistKey(
    title,
    steps.map((s) => (typeof s === 'string' ? s : s.title || s.label || s.name || ''))
  );
  useEffect(() => {
    let alive = true;
    loadChecked(storage, routineKey).then((keys) => {
      if (alive && keys.length) setCompletedSteps((prev) => new Set([...prev, ...keys]));
    });
    return () => {
      alive = false;
    };
  }, [storage, routineKey]);

  const handleToggleStep = (stepKey, s, i, nextChecked) => {
    const next = new Set(completedSteps);
    if (nextChecked) next.add(stepKey);
    else next.delete(stepKey);
    setCompletedSteps(next);
    saveChecked(storage, routineKey, next);

    if (onAction) {
      const label = typeof s === 'string' ? s : s.title || s.label || s.name || '';
      onAction({
        type: 'toggle_routine_step',
        payload: {
          routineId: data.id || 'current_routine',
          stepId: stepKey,
          title: label,
          isCompleted: nextChecked,
        },
      });
    }
  };

  // Progressive disclosure: the chat stays a conversation, not a dashboard.
  const VISIBLE = 4;
  const shown = steps.slice(0, VISIBLE);
  const hidden = steps.length - shown.length;
  const completedCount = completedSteps.size;
  const totalCount = steps.length;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  const total = data.totalDuration || data.total;

  return (
    <CardShell eyebrow={title} icon="time-outline">
      {totalCount > 0 && (
        <View style={styles.routineProgressHeader}>
          <Text style={styles.routineProgressText}>
            {isAllComplete
              ? '✨ Routine Completed!'
              : `${completedCount} of ${totalCount} completed`}
          </Text>
        </View>
      )}

      {shown.map((s, i) => {
        const stepKey = (typeof s === 'object' && s.id) || `step-${i}`;
        const label = typeof s === 'string' ? s : s.title || s.label || s.name || '';
        const meta = typeof s === 'object' ? s.duration || s.time || '' : '';
        const isChecked = completedSteps.has(stepKey);

        return (
          <StepRow
            key={stepKey}
            marker={`${i + 1}`}
            title={label}
            meta={meta}
            interactive={true}
            checked={isChecked}
            onToggle={(nextChecked) => handleToggleStep(stepKey, s, i, nextChecked)}
            last={i === shown.length - 1 && hidden <= 0 && !total}
          />
        );
      })}

      {hidden > 0 && (
        <Text style={styles.more}>
          +{hidden} more {hidden === 1 ? 'step' : 'steps'}
        </Text>
      )}

      {!!total && (
        <>
          <Divider />
          <Text style={styles.total}>Total: {total}</Text>
        </>
      )}

      <CardActions
        actions={
          actions && actions.length
            ? actions
            : [
                {
                  type: 'view_routine',
                  label: 'View Full Regimen',
                  payload: data,
                },
              ]
        }
        onAction={onAction}
      />
    </CardShell>
  );
}

/* ------------------------------------------------------- HAIR PROFILE / INSIGHT */

export function MyaHairInsightCard({ data = {}, actions, onAction }) {
  const narrative = data.summary || data.insight || data.text || data.description;
  const metrics = arr(data.metrics).length ? arr(data.metrics) : arr(data.attributes);

  if (!narrative && metrics.length === 0) return null;

  return (
    <CardShell eyebrow="Your hair insight" icon="analytics-outline">
      {!!narrative && <CardBody>{narrative}</CardBody>}
      {metrics.slice(0, 4).map((m, i) => {
        const label = m.label || m.name || '';
        if (!label) return null;
        const value = m.value ?? m.score;
        // Never invent a measurement: a metric with no value says so.
        if (value === undefined || value === null || value === '') {
          return (
            <View key={m.id || label || i} style={styles.unanalysed}>
              <Text style={styles.unanalysedLabel}>{label}</Text>
              <Text style={styles.unanalysedValue}>Not yet analysed</Text>
            </View>
          );
        }
        const max = m.max ?? (typeof value === 'number' && value <= 1 ? 1 : 100);
        return (
          <Meter
            key={m.id || label || i}
            label={label}
            value={value}
            max={max}
            valueLabel={m.display || m.valueLabel || (typeof value === 'number' && max === 100 ? `${Math.round(value)}%` : undefined)}
          />
        );
      })}
      <CardActions
        actions={actions && actions.length ? actions : [{ type: 'view_hair_profile', label: 'View Hair Profile', payload: data }]}
        onAction={onAction}
      />
    </CardShell>
  );
}

/* --------------------------------------------------------------------- GOAL */

export function MyaGoalCard({ data = {}, actions, onAction }) {
  const title = data.title || data.goal || data.name;
  if (!title) return null;

  const done = Number(data.completed ?? data.current ?? 0);
  const target = Number(data.target ?? data.total ?? 0);
  const pct = data.percent != null ? Number(data.percent) : target ? (done / target) * 100 : null;

  return (
    <CardShell eyebrow="Your goal" icon="flag-outline">
      <CardTitle>{title}</CardTitle>
      {pct != null && (
        <Meter label="Progress" value={pct} max={100} valueLabel={`${Math.round(pct)}%`} />
      )}
      {!!target && (
        <Text style={styles.subtle}>
          {done} of {target} days completed
        </Text>
      )}
      <CardActions
        actions={actions && actions.length ? actions : [{ type: 'view_goal', label: 'View Goal', payload: data }]}
        onAction={onAction}
      />
    </CardShell>
  );
}

/* ------------------------------------------------------------------ JOURNEY */

export function MyaJourneyCard({ data = {}, actions, onAction }) {
  const entries = arr(data.entries).length ? arr(data.entries) : arr(data.items);
  // Real field from buildJournalEntryBlock() is `notes`, not `note` - this
  // silently dropped every entry's actual content until checked against the
  // real backend shape (packages/core/src/hairJourney/hairJourneyService.js).
  const single = !entries.length && (data.title || data.notes || data.entryType);

  if (!entries.length && !single) return null;

  const shown = entries.slice(0, 3);

  return (
    <CardShell eyebrow={data.title && entries.length ? data.title : 'Your recent journey'} icon="calendar-outline">
      {single ? (
        <>
          {!!data.date && <Text style={styles.date}>{data.date}</Text>}
          <CardTitle>{data.title}</CardTitle>
          {!!data.notes && <CardBody>{data.notes}</CardBody>}
          {Array.isArray(data.photos) && data.photos.length > 0 && (
            <Text style={styles.subtle}>
              {data.photos.length} photo{data.photos.length === 1 ? '' : 's'}
            </Text>
          )}
        </>
      ) : (
        shown.map((e, i) => (
          <View key={e.id || i} style={[styles.entry, i < shown.length - 1 && styles.entryDivider]}>
            {!!(e.date || e.when) && <Text style={styles.date}>{e.date || e.when}</Text>}
            <Text style={styles.entryTitle} numberOfLines={2}>
              {e.title || e.label || e.notes || ''}
            </Text>
          </View>
        ))
      )}
      <CardActions
        actions={actions && actions.length ? actions : [{ type: 'view_hair_diary', label: 'View Hair Diary', payload: data }]}
        onAction={onAction}
      />
    </CardShell>
  );
}

/* ------------------------------------------------------- CHOICE / CONFIRMATION */

/**
 * Structured questions. Tapping an option continues the conversation rather
 * than opening a screen — that's what makes it a choice and not a menu.
 */
export function MyaChoiceGroup({ data = {}, actions, onAction }) {
  const prompt = data.prompt || data.question || data.title;
  const raw = arr(data.options).length ? arr(data.options) : arr(data.replies);
  const options = raw.length ? raw : arr(actions);

  if (options.length === 0) return null;

  return (
    <View style={styles.choiceWrap}>
      {!!prompt && <Text style={styles.choicePrompt}>{prompt}</Text>}
      <View style={styles.choiceRow}>
        {options.map((o, i) => {
          const label = typeof o === 'string' ? o : o.label || o.title || '';
          if (!label) return null;
          const payload = typeof o === 'string' ? o : o.payload || o.value || o.label;
          const type = (typeof o === 'object' && o.type) || 'choice_selected';
          return (
            <TouchableOpacity
              key={(typeof o === 'object' && o.id) || `opt-${i}`}
              style={styles.choiceChip}
              onPress={() => onAction && onAction({ type, label, payload })}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <Text style={styles.choiceText}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------- QUICK ACTION */

/** "Would you like me to add this to your routine?" + the button that does it. */
export function MyaQuickActionCard({ data = {}, actions, onAction }) {
  const prompt = data.prompt || data.text || data.title;
  const list = actions && actions.length ? actions : arr(data.actions);
  if (list.length === 0) return null;

  return (
    <CardShell eyebrow={data.eyebrow || 'Mya can do this for you'} icon="flash-outline">
      {!!prompt && <CardBody>{prompt}</CardBody>}
      <CardActions actions={list} onAction={onAction} />
    </CardShell>
  );
}

/* -------------------------------------------------------------- NAVIGATION */

export function MyaNavigationCard({ data = {}, actions, onAction }) {
  const label = data.label || data.title;
  if (!label) return null;
  return (
    <CardShell eyebrow={data.eyebrow || 'Go to'} icon="compass-outline">
      <CardTitle>{label}</CardTitle>
      {!!data.description && <CardBody>{data.description}</CardBody>}
      <CardActions
        actions={actions && actions.length ? actions : [{ type: data.action || 'navigate', label: data.cta || 'Open', payload: data }]}
        onAction={onAction}
      />
    </CardShell>
  );
}

/* ---------------------------------------------------------------- FALLBACK */

/**
 * Anything the registry doesn't know. Renders whatever is legible rather than
 * nothing, so a newer backend never produces a silent hole in the thread.
 */
export function MyaGenericCard({ data = {}, actions, onAction }) {
  const title = data.title || data.label || data.heading || data.name;
  const body = data.body || data.description || data.text || data.summary;
  // Never a silent hole: a block we can't read still says so.
  const nothing = !title && !body;
  return (
    <CardShell eyebrow={data.eyebrow} icon="information-circle-outline">
      {nothing && <CardBody>Mya shared something this version of the app can't show yet.</CardBody>}
      {!!title && <CardTitle>{title}</CardTitle>}
      {!!body && <CardBody>{body}</CardBody>}
      <CardActions actions={actions} onAction={onAction} />
    </CardShell>
  );
}

/* ------------------------------------------------------------- COMMUNITY_POST */

export function MyaCommunityPostCard({ data = {}, actions, onAction }) {
  const { id, author, channel, content, timestamp, likesCount: initialLikes = 14, commentsCount = 3 } = data;
  const [likes, setLikes] = React.useState(initialLikes);
  const [liked, setLiked] = React.useState(false);

  if (!content) return null;

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
      setLiked(false);
    } else {
      setLikes(likes + 1);
      setLiked(true);
      if (onAction) {
        onAction({ type: 'like_post', label: 'Like', payload: { postId: id } });
      }
    }
  };

  const handleComment = () => {
    if (onAction) {
      onAction({ type: 'comment_post', label: 'Comment', payload: { postId: id } });
    }
  };

  return (
    <CardShell eyebrow={`#${channel || 'community'}`} icon="people-outline">
      <View style={styles.authorRow}>
        <View style={styles.avatarMini}>
          <Text style={styles.avatarTextMini}>{(author || 'A').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.authorName}>@{author || 'Anonymous'}</Text>
          {!!timestamp && <Text style={styles.postDate}>{timestamp.slice(0, 10)}</Text>}
        </View>
      </View>
      
      <CardBody>{content}</CardBody>
      
      <Divider />
      
      <View style={styles.socialActionRow}>
        <TouchableOpacity
          onPress={handleLike}
          style={[styles.socialActionBtn, liked && styles.socialActionBtnLiked]}
          accessibilityRole="button"
          accessibilityLabel="Like community post"
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={16} color={liked ? MyaColors.berry : MyaColors.ink55} />
          <Text style={[styles.socialActionText, liked && styles.socialActionTextLiked]}>{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleComment}
          style={styles.socialActionBtn}
          accessibilityRole="button"
          accessibilityLabel="Comment on community post"
        >
          <Ionicons name="chatbubble-outline" size={15} color={MyaColors.ink55} />
          <Text style={styles.socialActionText}>{commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </CardShell>
  );
}

/* ------------------------------------------------------------------ MEDIA / HAIRSTYLE */

export function MyaMediaCard({ data = {}, actions, onAction }) {
  const {
    id,
    title,
    heading,
    category,
    subcategory,
    imageUrl,
    image,
    sourceUrl,
    source_url,
    hairType,
    hair_attributes,
    caption,
    description,
    educationalNotes,
    educational_notes,
    attribution,
    author_attribution,
    license,
  } = data;

  const resolvedTitle = title || heading || 'Visual Strand Reference';
  const resolvedImage = imageUrl || image || data.image_url || data.url || sourceUrl || source_url;
  const resolvedHairType = hairType || hair_attributes?.type;
  const resolvedCaption = caption || description;
  const resolvedNotes = educationalNotes || educational_notes;
  const resolvedAttribution = attribution || author_attribution || 'MYAVANA Research';
  const resolvedLicense = license || 'Verified Reference';
  const resolvedCategory = (category || 'Strand Intelligence').replace(/_/g, ' ');
  const resolvedSubcategory = (subcategory || '').replace(/_/g, ' ');

  const eyebrow = resolvedHairType
    ? `${resolvedCategory.toUpperCase()} • TYPE ${resolvedHairType}`
    : resolvedCategory.toUpperCase();

  return (
    <CardShell eyebrow={eyebrow} icon="camera-outline">
      {!!resolvedImage && (
        <Image
          source={{ uri: resolvedImage }}
          style={styles.hero}
          resizeMode="cover"
        />
      )}
      <CardTitle>{resolvedTitle}</CardTitle>
      {!!resolvedCaption && <CardBody>{resolvedCaption}</CardBody>}

      {!!resolvedNotes && (
        <View style={styles.scienceNoteBox}>
          <Text style={styles.scienceNoteText}>🔬 {resolvedNotes}</Text>
        </View>
      )}

      {!!resolvedSubcategory && (
        <View style={styles.mediaTagRow}>
          <View style={styles.mediaTagPill}>
            <Text style={styles.mediaTagText}>#{resolvedSubcategory}</Text>
          </View>
        </View>
      )}

      <Text style={styles.attributionLine}>
        📷 {resolvedAttribution} ({resolvedLicense})
      </Text>

      <CardActions
        actions={
          actions && actions.length
            ? actions
            : [{ type: 'view_media', label: 'View Details', payload: data }]
        }
        onAction={onAction}
      />
    </CardShell>
  );
}

const styles = StyleSheet.create({
  unanalysed: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unanalysedLabel: {
    ...MyaType.quickReply,
    color: MyaColors.ink70,
  },
  unanalysedValue: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
  },
  scienceNoteBox: {
    backgroundColor: MyaColors.berryTint,
    borderLeftWidth: 3,
    borderLeftColor: MyaColors.berry,
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
  },
  scienceNoteText: {
    ...MyaType.errorNote,
    fontStyle: 'italic',
    color: MyaColors.ink70,
    lineHeight: 18,
  },
  mediaTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  mediaTagPill: {
    backgroundColor: MyaColors.sand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mediaTagText: {
    ...MyaType.quickReply,
    color: MyaColors.ink55,
    fontFamily: MyaFonts.semibold,
  },
  attributionLine: {
    fontFamily: MyaFonts.regular,
    fontSize: moderateScale(10),
    color: MyaColors.ink40,
    marginVertical: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MyaColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarTextMini: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(11),
    color: MyaColors.berry,
  },
  authorName: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(12),
    color: MyaColors.onyx,
  },
  postDate: {
    ...MyaType.quickReply,
    color: MyaColors.ink40,
    fontSize: moderateScale(9),
  },
  socialActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  socialActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: MyaColors.sand,
    marginRight: 8,
  },
  socialActionBtnLiked: {
    backgroundColor: '#fee2e2',
  },
  socialActionText: {
    ...MyaType.quickReply,
    color: MyaColors.ink55,
    marginLeft: 4,
    fontFamily: MyaFonts.semibold,
  },
  socialActionTextLiked: {
    color: MyaColors.berry,
  },
  hero: {
    width: '100%',
    height: 132,
    borderRadius: 12,
    backgroundColor: MyaColors.sand,
    marginBottom: 10,
  },
  brand: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
    marginBottom: 2,
  },
  price: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(14),
    color: MyaColors.onyx,
    marginTop: 6,
  },
  more: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
    marginTop: 8,
  },
  total: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(13),
    color: MyaColors.onyx,
  },
  subtle: {
    ...MyaType.quickReply,
    color: MyaColors.ink45,
    marginTop: 6,
  },
  date: {
    fontFamily: MyaFonts.semibold,
    fontSize: moderateScale(11),
    letterSpacing: 0.4,
    color: MyaColors.berry,
    marginBottom: 3,
  },
  entry: {
    paddingVertical: 9,
  },
  entryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: MyaColors.ink06,
  },
  entryTitle: {
    ...MyaType.errorNote,
    color: MyaColors.onyx,
  },
  choiceWrap: {
    marginTop: 10,
    maxWidth: '90%',
  },
  choicePrompt: {
    ...MyaType.errorNote,
    color: MyaColors.ink58,
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  choiceChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: MyaRadii.pill,
    borderWidth: 1,
    borderColor: MyaColors.berryLine,
    backgroundColor: MyaColors.ivory,
    marginRight: 8,
    marginBottom: 8,
  },
  choiceText: {
    ...MyaType.quickReply,
    color: MyaColors.berry,
  },
  routineProgressHeader: {
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: MyaColors.ink06,
  },
  routineProgressText: {
    ...MyaType.quickReply,
    fontFamily: MyaFonts.semibold,
    color: MyaColors.berry,
  },
});
