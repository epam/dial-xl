package com.epam.deltix.quantgrid.web.utils;

import com.epam.deltix.quantgrid.web.service.compute.ClusterNodeEvent;
import com.epam.deltix.quantgrid.web.service.compute.ClusterNodeState;
import lombok.experimental.UtilityClass;
import org.redisson.client.codec.Codec;
import org.redisson.client.codec.StringCodec;
import org.redisson.codec.CompositeCodec;
import org.redisson.codec.TypedJsonJacksonCodec;

@UtilityClass
public class RedisUtils {

    public static final Codec NODE_STATE_CODEC = new CompositeCodec(
            StringCodec.INSTANCE,
            new TypedJsonJacksonCodec(ClusterNodeState.class, ClusterNodeState.class, ClusterNodeState.class));

    public static final Codec NODE_EVENT_CODEC = new TypedJsonJacksonCodec(ClusterNodeEvent.class);

}