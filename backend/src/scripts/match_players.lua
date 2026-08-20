-- KEYS[1]: queue_key ("matchmaking_queue")
-- ARGV[1]: player_id
-- ARGV[2]: mmr_tolerance (e.g., 100)

local mmr = redis.call('ZSCORE', KEYS[1], ARGV[1])
if not mmr then
    return nil
end

local min_mmr = tonumber(mmr) - tonumber(ARGV[2])
local max_mmr = tonumber(mmr) + tonumber(ARGV[2])

-- Find candidate players within the MMR bracket
local candidates = redis.call('ZRANGEBYSCORE', KEYS[1], min_mmr, max_mmr, 'LIMIT', 0, 2)

-- If we have at least 2 players (including the requester), pop them both atomically
if #candidates >= 2 then
    redis.call('ZREM', KEYS[1], candidates[1], candidates[2])
    return candidates
end

return nil