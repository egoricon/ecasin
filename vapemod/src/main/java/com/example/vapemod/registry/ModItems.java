package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import com.example.vapemod.item.Flavor;
import com.example.vapemod.item.LiquidItem;
import com.example.vapemod.item.VapeItem;
import net.minecraft.world.item.Item;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

import java.util.EnumMap;
import java.util.Map;

public final class ModItems {
    private ModItems() {}

    private static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, VapeMod.MODID);

    public static final RegistryObject<Item> VAPE = ITEMS.register("vape",
            () -> new VapeItem(new Item.Properties().setId(ITEMS.key("vape")).stacksTo(1)));

    public static final Map<Flavor, RegistryObject<Item>> LIQUIDS = new EnumMap<>(Flavor.class);

    static {
        for (Flavor flavor : Flavor.values()) {
            String name = "liquid_" + flavor.getSerializedName();
            LIQUIDS.put(flavor, ITEMS.register(name,
                    () -> new LiquidItem(flavor, new Item.Properties().setId(ITEMS.key(name)).stacksTo(16))));
        }
    }

    public static void register(BusGroup modBusGroup) {
        ITEMS.register(modBusGroup);
    }
}
