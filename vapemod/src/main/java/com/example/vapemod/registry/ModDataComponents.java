package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import com.example.vapemod.item.VapeLiquid;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.Registries;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;

public final class ModDataComponents {
    private ModDataComponents() {}

    private static final DeferredRegister<DataComponentType<?>> COMPONENTS = DeferredRegister.create(Registries.DATA_COMPONENT_TYPE, VapeMod.MODID);

    /** Liquid loaded into a vape: flavour and remaining puffs. Absent = empty vape. */
    public static final RegistryObject<DataComponentType<VapeLiquid>> LIQUID = COMPONENTS.register("liquid",
            () -> DataComponentType.<VapeLiquid>builder()
                    .persistent(VapeLiquid.CODEC)
                    .networkSynchronized(VapeLiquid.STREAM_CODEC)
                    .build());

    public static void register(BusGroup modBusGroup) {
        COMPONENTS.register(modBusGroup);
    }
}
