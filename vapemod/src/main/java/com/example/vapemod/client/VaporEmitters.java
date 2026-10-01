package com.example.vapemod.client;

import com.example.vapemod.registry.ModParticles;
import net.minecraft.client.CameraType;
import net.minecraft.client.Minecraft;
import net.minecraft.client.particle.Particle;
import net.minecraft.client.particle.SingleQuadParticle;
import net.minecraft.util.Mth;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * A vapour cloud started by an exhale. It is started only when the server reports a release of
 * right click ({@link com.example.vapemod.network.VaporPacket}), then keeps puffing out of the
 * player's mouth for a moment: a short puff gives a small cloud, a full puff a big, longer one.
 */
public final class VaporEmitters {
    private VaporEmitters() {}

    private static final List<Emitter> EMITTERS = new ArrayList<>();
    private static final RandomSource RANDOM = RandomSource.create();

    private static final class Emitter {
        final int entityId;
        final float strength;
        final float r, g, b;
        final int duration;
        int age;

        Emitter(int entityId, float strength, int color) {
            this.entityId = entityId;
            this.strength = strength;
            // mostly white vapour with a light hint of the liquid colour
            this.r = Mth.lerp(0.18F, 1.0F, ((color >> 16) & 0xFF) / 255.0F);
            this.g = Mth.lerp(0.18F, 1.0F, ((color >> 8) & 0xFF) / 255.0F);
            this.b = Mth.lerp(0.18F, 1.0F, (color & 0xFF) / 255.0F);
            this.duration = 4 + Math.round(18.0F * strength);
        }
    }

    public static void start(int entityId, float strength, int color) {
        EMITTERS.add(new Emitter(entityId, Mth.clamp(strength, 0.0F, 1.0F), color));
    }

    public static void clear() {
        EMITTERS.clear();
    }

    public static void tick() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.level == null) {
            EMITTERS.clear();
            return;
        }
        if (mc.isPaused()) return;

        Iterator<Emitter> it = EMITTERS.iterator();
        while (it.hasNext()) {
            Emitter emitter = it.next();
            Entity entity = mc.level.getEntity(emitter.entityId);
            if (entity == null || entity.isRemoved() || entity.isUnderWater() || emitter.age >= emitter.duration) {
                it.remove();
                continue;
            }
            spawn(mc, entity, emitter);
            emitter.age++;
        }
    }

    private static void spawn(Minecraft mc, Entity entity, Emitter emitter) {
        float progress = (float) emitter.age / emitter.duration;
        // strongest right after the release, fading out
        int count = Math.max(1, Math.round((1.0F + 4.0F * emitter.strength) * (1.0F - 0.7F * progress)));
        Vec3 look = entity.getLookAngle();
        boolean firstPerson = entity == mc.getCameraEntity() && mc.options.getCameraType() == CameraType.FIRST_PERSON;
        double forward = firstPerson ? 0.55 : 0.3;
        Vec3 mouth = entity.getEyePosition().add(look.scale(forward)).add(0.0, -0.12, 0.0);
        double speed = (0.05 + 0.11 * emitter.strength) * (1.0F - 0.5F * progress);

        for (int i = 0; i < count; i++) {
            double vx = look.x * speed * (0.7 + 0.6 * RANDOM.nextDouble()) + RANDOM.nextGaussian() * 0.012;
            double vy = look.y * speed * (0.7 + 0.6 * RANDOM.nextDouble()) + RANDOM.nextGaussian() * 0.008 + 0.012;
            double vz = look.z * speed * (0.7 + 0.6 * RANDOM.nextDouble()) + RANDOM.nextGaussian() * 0.012;
            Particle particle = mc.particleEngine.createParticle(ModParticles.VAPOR.get(),
                    mouth.x + RANDOM.nextGaussian() * 0.03, mouth.y + RANDOM.nextGaussian() * 0.03, mouth.z + RANDOM.nextGaussian() * 0.03,
                    vx, vy, vz);
            if (particle instanceof SingleQuadParticle quad) {
                quad.setColor(emitter.r, emitter.g, emitter.b);
            }
            if (particle instanceof VaporParticle vapor) {
                vapor.setStrength(emitter.strength);
            }
        }
    }
}
