package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import net.minecraft.resources.Identifier;
import net.minecraft.sounds.SoundEvent;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModSounds {
    private ModSounds() {}

    private static final DeferredRegister<SoundEvent> SOUNDS = DeferredRegister.create(ForgeRegistries.SOUND_EVENTS, VapeMod.MODID);

    public static final RegistryObject<SoundEvent> VAPE_INHALE = register("vape_inhale");
    public static final RegistryObject<SoundEvent> VAPE_EXHALE = register("vape_exhale");
    public static final RegistryObject<SoundEvent> COUGH = register("cough");

    private static RegistryObject<SoundEvent> register(String name) {
        return SOUNDS.register(name, () -> SoundEvent.createVariableRangeEvent(Identifier.fromNamespaceAndPath(VapeMod.MODID, name)));
    }

    public static void register(BusGroup modBusGroup) {
        SOUNDS.register(modBusGroup);
    }
}
