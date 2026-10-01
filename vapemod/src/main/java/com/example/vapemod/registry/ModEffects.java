package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import com.example.vapemod.effect.CoughEffect;
import com.example.vapemod.effect.CravingEffect;
import net.minecraft.core.Holder;
import net.minecraft.world.effect.MobEffect;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModEffects {
    private ModEffects() {}

    private static final DeferredRegister<MobEffect> EFFECTS = DeferredRegister.create(ForgeRegistries.MOB_EFFECTS, VapeMod.MODID);

    /** Over the limit: slows the player down and makes them cough (nausea is applied alongside). */
    public static final RegistryObject<MobEffect> COUGH = EFFECTS.register("cough", CoughEffect::new);
    /** Bar empty for too long: slightly slower mining and weaker hits. */
    public static final RegistryObject<MobEffect> CRAVING = EFFECTS.register("craving", CravingEffect::new);

    public static Holder<MobEffect> holder(RegistryObject<MobEffect> effect) {
        return effect.getHolder().orElseThrow();
    }

    public static void register(BusGroup modBusGroup) {
        EFFECTS.register(modBusGroup);
    }
}
