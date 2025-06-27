import { supabase } from './supabase';

/**
 * Submit a vote for an ember name
 */
export async function submitVote(emberId, suggestedName, isCustom = false) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const voteData = {
      ember_id: emberId,
      suggested_name: suggestedName,
      is_custom: isCustom
    };

    // Add user info based on authentication status
    if (user) {
      voteData.user_id = user.id;
    } else {
      // For anonymous users, we'd need to handle email collection
      // For now, throw an error for anonymous users
      throw new Error('Authentication required to vote');
    }

    const { data, error } = await supabase
      .from('ember_name_votes')
      .upsert(voteData, {
        onConflict: user ? 'ember_id,user_id' : 'ember_id,user_email'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw error;
  }
}

/**
 * Get voting results for an ember
 */
export async function getVotingResults(emberId) {
  try {
    const { data, error } = await supabase
      .rpc('get_ember_voting_results', { ember_uuid: emberId });

    if (error) throw error;
    
    // Calculate total votes
    const totalVotes = data.reduce((sum, result) => sum + parseInt(result.vote_count), 0);
    
    return {
      results: data,
      totalVotes
    };
  } catch (error) {
    console.error('Error fetching voting results:', error);
    throw error;
  }
}

/**
 * Check if current user has voted and get their vote
 */
export async function getUserVote(emberId) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_vote', { ember_uuid: emberId });

    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error checking user vote:', error);
    throw error;
  }
}

/**
 * Get all votes for an ember (for debugging/admin)
 */
export async function getAllVotes(emberId) {
  try {
    const { data, error } = await supabase
      .from('ember_name_votes')
      .select('*')
      .eq('ember_id', emberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching all votes:', error);
    throw error;
  }
}

/**
 * Delete user's vote
 */
export async function deleteVote(emberId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }

    const { error } = await supabase
      .from('ember_name_votes')
      .delete()
      .eq('ember_id', emberId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting vote:', error);
    throw error;
  }
}

/**
 * Get voting status for all participants of an ember
 */
export async function getParticipantVotingStatus(emberId) {
  try {
    // Get all votes for this ember
    const { data: votes, error } = await supabase
      .from('ember_name_votes')
      .select('user_id')
      .eq('ember_id', emberId);

    if (error) throw error;
    
    // Return array of user IDs who have voted
    return votes.map(vote => vote.user_id);
  } catch (error) {
    console.error('Error fetching participant voting status:', error);
    throw error;
  }
} 