-- Add current_stage and interaction_intent columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN current_stage text CHECK (current_stage IN ('exploring', 'clarifying', 'building', 'stabilising', 'reflecting')),
ADD COLUMN interaction_intent text[] DEFAULT '{}';

-- Create constraint to ensure max 2 interaction intents
CREATE OR REPLACE FUNCTION public.validate_interaction_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF array_length(NEW.interaction_intent, 1) > 2 THEN
    RAISE EXCEPTION 'Maximum 2 interaction intents allowed';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_interaction_intent_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_interaction_intent();

-- Add message_intent column to messages table for storing intent with first messages
ALTER TABLE public.messages
ADD COLUMN message_intent text CHECK (message_intent IN ('perspective', 'reality_check', 'decision_support', 'emotional_reassurance', 'strategic_clarity'));

-- Update compute_matches function to prioritize by stage and intent overlap
CREATE OR REPLACE FUNCTION public.compute_matches(p_user_id uuid)
RETURNS TABLE(matched_user_id uuid, score integer, overlapping_tags text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_stage text;
  v_user_intents text[];
  v_stage_order text[] := ARRAY['exploring', 'clarifying', 'building', 'stabilising', 'reflecting'];
  v_user_stage_index integer;
BEGIN
  -- Get current user's stage and intents
  SELECT current_stage, interaction_intent 
  INTO v_user_stage, v_user_intents
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Get user's stage index
  SELECT array_position(v_stage_order, v_user_stage) INTO v_user_stage_index;
  
  RETURN QUERY
  WITH user_needs AS (
    SELECT t.label
    FROM profile_needs pn
    JOIN tags t ON t.id = pn.tag_id
    WHERE pn.user_id = p_user_id
  ),
  user_profile AS (
    SELECT timezone, languages
    FROM profiles
    WHERE user_id = p_user_id
  ),
  potential_matches AS (
    SELECT 
      p.user_id AS match_id,
      p.timezone AS match_timezone,
      p.languages AS match_languages,
      p.current_stage AS match_stage,
      p.interaction_intent AS match_intents,
      ARRAY_AGG(t.label) FILTER (WHERE t.label IN (SELECT label FROM user_needs)) AS matching_tags
    FROM profiles p
    JOIN profile_offers po ON po.user_id = p.user_id
    JOIN tags t ON t.id = po.tag_id
    WHERE p.user_id != p_user_id
      AND p.status = 'approved'
      AND p.completed = true
    GROUP BY p.user_id, p.timezone, p.languages, p.current_stage, p.interaction_intent
    HAVING ARRAY_LENGTH(ARRAY_AGG(t.label) FILTER (WHERE t.label IN (SELECT label FROM user_needs)), 1) > 0
  )
  SELECT 
    pm.match_id,
    (
      COALESCE(ARRAY_LENGTH(pm.matching_tags, 1), 0) * 2 +
      CASE WHEN pm.match_languages && (SELECT languages FROM user_profile) THEN 1 ELSE 0 END +
      -- Stage bonus: same stage or one ahead
      CASE 
        WHEN v_user_stage_index IS NOT NULL AND pm.match_stage IS NOT NULL THEN
          CASE 
            WHEN array_position(v_stage_order, pm.match_stage) = v_user_stage_index THEN 2
            WHEN array_position(v_stage_order, pm.match_stage) = v_user_stage_index + 1 THEN 2
            ELSE 0
          END
        ELSE 0
      END +
      -- Intent overlap bonus
      CASE 
        WHEN v_user_intents IS NOT NULL AND pm.match_intents IS NOT NULL 
             AND v_user_intents && pm.match_intents THEN 2
        ELSE 0
      END
    )::INTEGER AS match_score,
    pm.matching_tags
  FROM potential_matches pm
  ORDER BY match_score DESC
  LIMIT 10;
END;
$function$;