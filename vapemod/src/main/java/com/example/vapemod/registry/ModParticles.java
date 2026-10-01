package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import net.minecraft.core.particles.ParticleType;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModParticles {
    private ModParticles() {}

    private static final DeferredRegister<ParticleType<?>> PARTICLES = DeferredRegister.create(ForgeRegistries.PARTICLE_TYPES, VapeMod.MODID);

    /** Soft vapour puff, spawned client-side when a player exhales. */
    public static final RegistryObject<SimpleParticleType> VAPOR = PARTICLES.register("vapor", () -> new SimpleParticleType(false));

    public static void register(BusGroup modBusGroup) {
        PARTICLES.register(modBusGroup);
    }
}
