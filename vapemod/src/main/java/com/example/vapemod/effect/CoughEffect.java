package com.example.vapemod.effect;

import com.example.vapemod.VapeMod;
import com.example.vapemod.registry.ModSounds;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;

/** Over the limit: -25% movement speed per level and a cough every couple of seconds. */
public class CoughEffect extends MobEffect {
    public CoughEffect() {
        super(MobEffectCategory.HARMFUL, 0xB9C3C7);
        addAttributeModifier(Attributes.MOVEMENT_SPEED, Identifier.fromNamespaceAndPath(VapeMod.MODID, "effect.cough"),
                -0.25, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
    }

    @Override
    public boolean shouldApplyEffectTickThisTick(int remainingDuration, int amplifier) {
        return remainingDuration % 50 == 0;
    }

    @Override
    public boolean applyEffectTick(ServerLevel level, LivingEntity entity, int amplifier) {
        level.playSound(null, entity.getX(), entity.getEyeY(), entity.getZ(), ModSounds.COUGH.get(), SoundSource.PLAYERS,
                0.8F, 0.9F + entity.getRandom().nextFloat() * 0.2F);
        return true;
    }
}
