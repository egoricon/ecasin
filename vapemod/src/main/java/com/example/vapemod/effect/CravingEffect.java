package com.example.vapemod.effect;

import com.example.vapemod.VapeMod;
import net.minecraft.resources.Identifier;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;

/** Bar empty for too long: -20% mining speed and -10% attack damage per level. */
public class CravingEffect extends MobEffect {
    public CravingEffect() {
        super(MobEffectCategory.HARMFUL, 0x6B4F4F);
        addAttributeModifier(Attributes.BLOCK_BREAK_SPEED, Identifier.fromNamespaceAndPath(VapeMod.MODID, "effect.craving.mining"),
                -0.2, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
        addAttributeModifier(Attributes.ATTACK_DAMAGE, Identifier.fromNamespaceAndPath(VapeMod.MODID, "effect.craving.attack"),
                -0.1, AttributeModifier.Operation.ADD_MULTIPLIED_TOTAL);
    }
}
