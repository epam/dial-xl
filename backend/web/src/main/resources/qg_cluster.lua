local function _is_nil(arg)
    return arg == false or arg == nil
end

local function _is_not_nil(arg)
    return not _is_nil(arg)
end

local function _time()
    local time = redis.call('TIME')
    return time[1] * 1000 + math.floor(time[2] / 1000)
end

local function _add_compute_node(namespace, node_id, node_endpoint, node_timeout)
    local node_key = namespace .. '.node.' .. node_id
    local nodes_key = namespace .. '.nodes'
    local nodes_free_key = namespace .. '.nodes_free'

    if (redis.call('EXISTS', node_key) == 1) then
        return 0
    end

    local time = _time()

    redis.call('HSET', node_key, 'node_endpoint', node_endpoint)
    redis.call('ZADD', nodes_key, time + node_timeout, node_id)
    redis.call('ZADD', nodes_free_key, 1, node_id)

    return 1
end

local function _remove_compute_node(namespace, node_id)
    local node_key = namespace .. '.node.' .. node_id
    local node_operations_key =  namespace .. '.node_operations.' .. node_id
    local nodes_key = namespace .. '.nodes'
    local nodes_free_key = namespace .. '.nodes_free'
    local operations_key = namespace .. '.operations'

    if (redis.call('DEL', node_key) == 0) then
        return 0
    end

    local node_operation_ids = redis.call('SMEMBERS', node_operations_key)
    for _, node_operation_id in ipairs(node_operation_ids) do
        local node_operation_key = namespace .. '.operation.' .. node_operation_id
        redis.call('DEL', node_operation_key)
        redis.call('ZREM', operations_key, node_operation_id)
    end

    redis.call('DEL', node_operations_key)
    redis.call('ZREM', nodes_key, node_id)
    redis.call('ZREM', nodes_free_key, node_id)

    return 1
end

local function _heartbeat_compute_node(namespace, node_id, node_timeout)
    local node_key = namespace .. '.node.' .. node_id
    local nodes_key = namespace .. '.nodes'

    if (redis.call('EXISTS', node_key) == 0) then
        return 0
    end

    local time = _time()
    redis.call('ZADD', nodes_key, time + node_timeout, node_id)

    return 1
end

local function _begin_compute_operation(namespace, project_id, project_timeout, operation_id, operation_timeout)
    local project_key = namespace .. '.project.' .. project_id
    local operation_key = namespace .. '.operation.' .. operation_id
    local operations_key = namespace .. '.operations'

    if (redis.call('EXISTS', operation_key) == 1) then
        return nil
    end

    local node_id = redis.call('HGET', project_key, 'node_id')

    if (_is_not_nil(node_id)) then
        local node_key = namespace .. '.node.' .. node_id

        if (redis.call('EXISTS', node_key) == 0) then
            node_id = nil
        end
    end

    if (_is_not_nil(node_id)) then
        local node_operations_key = namespace .. '.node_operations.' .. node_id
        local node_operation_id = redis.call('SRANDMEMBER', node_operations_key)
        local node_project_id = nil

        if (_is_not_nil(node_operation_id)) then
            local node_operation_key = namespace .. '.operation.' .. node_operation_id
            node_project_id = redis.call('HGET', node_operation_key, 'project_id')
        end

        if (_is_not_nil(node_project_id) and project_id ~= node_project_id) then
            node_id = nil
        end
    end

    if (_is_nil(node_id)) then
        local nodes_free_key = namespace .. '.nodes_free'
        node_id = redis.call('ZPOPMIN', nodes_free_key)[1]
    end

    if (_is_nil(node_id)) then
        return nil
    end

    local node_key = namespace .. '.node.' .. node_id
    local node_operations_key = namespace .. '.node_operations.' .. node_id

    local time = _time()

    redis.call('HSET', project_key, 'node_id', node_id)
    redis.call('PEXPIREAT', project_key, time + project_timeout)
    redis.call('SADD', node_operations_key, operation_id)
    redis.call('HSET', operation_key, 'node_id', node_id, 'project_id', project_id)
    redis.call('ZADD', operations_key,  time + operation_timeout, operation_id)

    return redis.call('HGET', node_key, 'node_endpoint')
end

local function _complete_compute_operation(namespace, operation_id)
    local operation_key = namespace .. '.operation.' .. operation_id
    local operations_key = namespace .. '.operations'

    if (redis.call('EXISTS', operation_key) == 0) then
        return 0
    end

    local node_id = redis.call('HGET', operation_key, 'node_id')
    local node_operations_key = namespace .. '.node_operations.' .. node_id

    local time = _time()

    redis.call('DEL', operation_key)
    redis.call('ZREM', operations_key, operation_id)
    redis.call('SREM', node_operations_key, operation_id)

    if (redis.call('EXISTS', node_operations_key) == 0) then
        local nodes_free_key = namespace .. '.nodes_free'
        redis.call('ZADD', nodes_free_key, time, node_id)
    end

    return 1
end

local function _evict(namespace)
    local time = _time()

    local nodes_key = namespace .. '.nodes'
    local node_ids = redis.call('ZRANGEBYSCORE', nodes_key, '-inf', time)

    for _, node_id in ipairs(node_ids) do
        _remove_compute_node(namespace, node_id)
    end

    local operations_key = namespace .. '.operations'
    local operations_ids = redis.call('ZRANGEBYSCORE', operations_key, '-inf', time)

    for _, operation_id in ipairs(operations_ids) do
        _complete_compute_operation(namespace, operation_id)
    end

    return 1
end

local function evict(keys, args)
    return _evict(keys[1])
end

local function add_compute_node(keys, args)
    _evict(keys[1])
    return _add_compute_node(keys[1], args[1], args[2], tonumber(args[3]))
end

local function remove_compute_node(keys, args)
    _evict(keys[1])
    return _remove_compute_node(keys[1], args[1])
end

local function heartbeat_compute_node(keys, args)
    _evict(keys[1])
    return _heartbeat_compute_node(keys[1], args[1], tonumber(args[2]))
end

local function begin_compute_operation(keys, args)
    _evict(keys[1])
    return _begin_compute_operation(keys[1], args[1], tonumber(args[2]), args[3], tonumber(args[4]))
end

local function complete_compute_operation(keys, args)
    _evict(keys[1])
    return _complete_compute_operation(keys[1], args[1])
end

redis.register_function('qg_cluster_evict', evict)
redis.register_function('qg_cluster_add_compute_node', add_compute_node)
redis.register_function('qg_cluster_remove_compute_node', remove_compute_node)
redis.register_function('qg_cluster_heartbeat_compute_node', heartbeat_compute_node)
redis.register_function('qg_cluster_begin_compute_operation', begin_compute_operation)
redis.register_function('qg_cluster_complete_compute_operation', complete_compute_operation)