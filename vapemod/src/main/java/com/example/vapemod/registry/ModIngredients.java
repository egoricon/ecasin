package com.example.vapemod.registry;

import com.example.vapemod.VapeMod;
import com.example.vapemod.crafting.WaterBottleIngredient;
import net.minecraftforge.common.crafting.ingredients.IIngredientSerializer;
import net.minecraftforge.eventbus.api.bus.BusGroup;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;

public final class ModIngredients {
    private ModIngredients() {}

    private static final DeferredRegister<IIngredientSerializer<?>> SERIALIZERS =
            DeferredRegister.create(ForgeRegistries.Keys.INGREDIENT_SERIALIZERS, VapeMod.MODID);

    static {
        SERIALIZERS.register("water_bottle", () -> WaterBottleIngredient.SERIALIZER);
    }

    public static void register(BusGroup modBusGroup) {
        SERIALIZERS.register(modBusGroup);
    }
}
