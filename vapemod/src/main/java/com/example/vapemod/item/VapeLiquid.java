package com.example.vapemod.item;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;

/** Data component stored on a vape: which liquid is loaded and how many puffs are left. */
public record VapeLiquid(Flavor flavor, int puffs, int capacity) {
    public static final Codec<VapeLiquid> CODEC = RecordCodecBuilder.create(i -> i.group(
            Flavor.CODEC.fieldOf("flavor").forGetter(VapeLiquid::flavor),
            Codec.INT.fieldOf("puffs").forGetter(VapeLiquid::puffs),
            Codec.INT.fieldOf("capacity").forGetter(VapeLiquid::capacity)
    ).apply(i, VapeLiquid::new));

    public static final StreamCodec<ByteBuf, VapeLiquid> STREAM_CODEC = StreamCodec.composite(
            Flavor.STREAM_CODEC, VapeLiquid::flavor,
            ByteBufCodecs.VAR_INT, VapeLiquid::puffs,
            ByteBufCodecs.VAR_INT, VapeLiquid::capacity,
            VapeLiquid::new);

    public VapeLiquid withPuffs(int newPuffs) {
        return new VapeLiquid(flavor, newPuffs, capacity);
    }
}
