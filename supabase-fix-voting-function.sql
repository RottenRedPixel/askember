-- Fix ambiguous column reference in get_ember_voting_results function
CREATE OR REPLACE FUNCTION get_ember_voting_results(ember_uuid UUID)
RETURNS TABLE (
    suggested_name TEXT,
    vote_count BIGINT,
    is_custom BOOLEAN,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH vote_counts AS (
        SELECT 
            env.suggested_name,
            COUNT(*) as count_votes,
            env.is_custom
        FROM ember_name_votes env
        WHERE env.ember_id = ember_uuid
        GROUP BY env.suggested_name, env.is_custom
    ),
    total_votes AS (
        SELECT SUM(count_votes) as total FROM vote_counts
    )
    SELECT 
        vc.suggested_name,
        vc.count_votes,
        vc.is_custom,
        ROUND((vc.count_votes::NUMERIC / tv.total::NUMERIC) * 100, 1) as percentage
    FROM vote_counts vc
    CROSS JOIN total_votes tv
    ORDER BY vc.count_votes DESC, vc.suggested_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 