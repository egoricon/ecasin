package com.example.vapemod.item;

import com.mojang.serialization.Codec;
import io.netty.buffer.ByteBuf;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.util.StringRepresentable;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffects;

import java.util.function.Supplier;

/** Liquid flavours. To add a flavour: add a constant here, a texture, a model, a recipe and lang keys. */
public enum Flavor implements StringRepresentable {
    APPLE("apple", 0xD8352A, () -> MobEffects.REGENERATION),
    MINT("mint", 0x2FC79A, () -> MobEffects.SPEED),
    BERRY("berry", 0x8E2A8C, () -> MobEffects.ABSORPTION);

    public static final Codec<Flavor> CODEC = StringRepresentable.fromEnum(Flavor::values);
    public static final StreamCodec<ByteBuf, Flavor> STREAM_CODEC = ByteBufCodecs.idMapper(i -> values()[i], Flavor::ordinal);

    private final String name;
    private final int color;
    private final Supplier<Holder<MobEffect>> effect;

    Flavor(String name, int color, Supplier<Holder<MobEffect>> effect) {
        this.name = name;
        this.color = color;
        this.effect = effect;
    }

    @Override
    public String getSerializedName() {
        return name;
    }

    /** RGB colour of the liquid (item bar and vapour tint). */
    public int color() {
        return color;
    }

    public Holder<MobEffect> effect() {
        return effect.get();
    }

    public Component displayName() {
        return Component.translatable("flavor.vapemod." + name);
    }
}
