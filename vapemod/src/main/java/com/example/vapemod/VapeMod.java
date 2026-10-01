package com.example.vapemod;

import com.example.vapemod.client.VapeClient;
import com.example.vapemod.network.VapeNetwork;
import com.example.vapemod.registry.ModCreativeTabs;
import com.example.vapemod.registry.ModDataComponents;
import com.example.vapemod.registry.ModEffects;
import com.example.vapemod.registry.ModIngredients;
import com.example.vapemod.registry.ModItems;
import com.example.vapemod.registry.ModParticles;
import com.example.vapemod.registry.ModSounds;
import com.example.vapemod.vape.VapeEvents;
import com.mojang.logging.LogUtils;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.config.ModConfig;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import net.minecraftforge.fml.loading.FMLEnvironment;
import org.slf4j.Logger;

// The value here should match an entry in the META-INF/mods.toml file
@Mod(VapeMod.MODID)
public final class VapeMod {
    public static final String MODID = "vapemod";
    public static final Logger LOGGER = LogUtils.getLogger();

    public VapeMod(FMLJavaModLoadingContext context) {
        var modBusGroup = context.getModBusGroup();

        ModDataComponents.register(modBusGroup);
        ModItems.register(modBusGroup);
        ModEffects.register(modBusGroup);
        ModSounds.register(modBusGroup);
        ModParticles.register(modBusGroup);
        ModIngredients.register(modBusGroup);
        ModCreativeTabs.register(modBusGroup);

        context.registerConfig(ModConfig.Type.COMMON, VapeConfig.COMMON_SPEC);
        context.registerConfig(ModConfig.Type.CLIENT, VapeConfig.CLIENT_SPEC);

        VapeNetwork.init();
        VapeEvents.register();

        if (FMLEnvironment.dist == Dist.CLIENT) {
            VapeClient.init(modBusGroup);
        }
        LOGGER.info("Vape Mod loaded");
    }
}
