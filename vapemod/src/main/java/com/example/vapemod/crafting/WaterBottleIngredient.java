package com.example.vapemod.crafting;

import com.mojang.serialization.MapCodec;
import net.minecraft.core.HolderSet;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.alchemy.PotionContents;
import net.minecraft.world.item.alchemy.Potions;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraftforge.common.crafting.ingredients.AbstractIngredient;
import net.minecraftforge.common.crafting.ingredients.IIngredientSerializer;
import org.jetbrains.annotations.Nullable;

/** Recipe ingredient {"type": "vapemod:water_bottle"}: only a water bottle, not any potion. */
public final class WaterBottleIngredient extends AbstractIngredient {
    public static final MapCodec<WaterBottleIngredient> CODEC = MapCodec.unit(WaterBottleIngredient::new);

    public static final IIngredientSerializer<WaterBottleIngredient> SERIALIZER = new IIngredientSerializer<>() {
        @Override
        public MapCodec<? extends WaterBottleIngredient> codec() {
            return CODEC;
        }

        @Override
        public void write(RegistryFriendlyByteBuf buffer, WaterBottleIngredient value) {
        }

        @Override
        public WaterBottleIngredient read(RegistryFriendlyByteBuf buffer) {
            return new WaterBottleIngredient();
        }
    };

    @SuppressWarnings("deprecation")
    public WaterBottleIngredient() {
        super(HolderSet.direct(Items.POTION.builtInRegistryHolder()));
    }

    @Override
    public boolean test(@Nullable ItemStack stack) {
        if (stack == null || !stack.is(Items.POTION)) return false;
        PotionContents contents = stack.get(DataComponents.POTION_CONTENTS);
        return contents != null && contents.is(Potions.WATER);
    }

    @Override
    public boolean isSimple() {
        return false;
    }

    @Override
    public IIngredientSerializer<? extends Ingredient> serializer() {
        return SERIALIZER;
    }
}
