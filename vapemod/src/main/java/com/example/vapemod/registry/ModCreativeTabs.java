package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import com.example.vapemod.item.Flavor;
import com.example.vapemod.item.VapeItem;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;

public final class ModCreativeTabs {
    private ModCreativeTabs() {}

    private static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, VapeMod.MODID);

    public static final RegistryObject<CreativeModeTab> VAPE_TAB = TABS.register("vapemod", () -> CreativeModeTab.builder()
            .title(Component.translatable("itemGroup.vapemod"))
            .withTabsBefore(CreativeModeTabs.FOOD_AND_DRINKS)
            .icon(() -> VapeItem.filled(ModItems.VAPE.get().getDefaultInstance(), Flavor.MINT))
            .displayItems((_, output) -> {
                output.accept(ModItems.VAPE.get());
                for (Flavor flavor : Flavor.values()) {
                    output.accept(VapeItem.filled(ModItems.VAPE.get().getDefaultInstance(), flavor));
                }
                for (Flavor flavor : Flavor.values()) {
                    output.accept(ModItems.LIQUIDS.get(flavor).get());
                }
            })
            .build());

    public static void register(BusGroup modBusGroup) {
        TABS.register(modBusGroup);
    }
}
