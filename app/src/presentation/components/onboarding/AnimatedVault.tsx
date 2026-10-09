import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated, Easing } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Circle,
  G,
  Line,
  Path,
} from 'react-native-svg';
export const AnimatedVault: React.FC<{ size?: number }> = ({ size = 260 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleBadgeAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // 1. Wheel rotation keyframe loop: 0 -> 60 -> -30 -> 20 -> 0 deg
    const wheelAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 60,
          duration: 1750,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -30,
          duration: 2450,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 20,
          duration: 1400,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Ambient pulse loop
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Success badge pop
    const badgePop = Animated.spring(scaleBadgeAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    });

    wheelAnimation.start();
    pulseAnimation.start();
    badgePop.start();

    return () => {
      wheelAnimation.stop();
      pulseAnimation.stop();
    };
  }, [rotateAnim, pulseAnim, scaleBadgeAnim]);

  // On Web, render the exact keyframed SVG for 120fps browser rendering
  if (Platform.OS === 'web') {
    const rawSvgHtml = `
      <div style="width: ${size}px; height: ${size}px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
        <style>
          @keyframes pulseRing {
            0% { r: 120px; opacity: 0.6; }
            50% { r: 135px; opacity: 0.15; }
            100% { r: 120px; opacity: 0.6; }
          }
          @keyframes wheelRotate {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(60deg); }
            60% { transform: rotate(-30deg); }
            80% { transform: rotate(20deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes lockEngage {
            0% { transform: scale(0.6); opacity: 0; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes particleSparkle {
            0%, 100% { opacity: 0.2; transform: translateY(0); }
            50% { opacity: 0.9; transform: translateY(-4px); }
          }
          @keyframes checkSuccess {
            0% { stroke-dashoffset: 40; opacity: 0; }
            60% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }

          .vault-ambient-glow {
            animation: pulseRing 4s ease-in-out infinite;
            transform-origin: 160px 160px;
          }
          .vault-wheel-assembly {
            animation: wheelRotate 7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            transform-origin: 160px 160px;
          }
          .vault-success-badge {
            animation: lockEngage 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transform-origin: 160px 160px;
          }
          .vault-check-path {
            stroke-dasharray: 40;
            animation: checkSuccess 1.2s cubic-bezier(0.65, 0, 0.45, 1) forwards;
          }
          .vault-sparkle-1 { animation: particleSparkle 2.5s ease-in-out infinite; }
          .vault-sparkle-2 { animation: particleSparkle 3s ease-in-out infinite 0.8s; }
          .vault-sparkle-3 { animation: particleSparkle 2s ease-in-out infinite 1.4s; }
        </style>
        <svg viewBox="0 0 320 320" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient cx="50%" cy="50%" id="vaultGlow" r="50%">
              <stop offset="0%" stop-color="#22c55e" stop-opacity="0.35"></stop>
              <stop offset="60%" stop-color="#22c55e" stop-opacity="0.08"></stop>
              <stop offset="100%" stop-color="#22c55e" stop-opacity="0"></stop>
            </radialGradient>
            <linearGradient id="doorGrad" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"></stop>
              <stop offset="50%" stop-color="#0f172a"></stop>
              <stop offset="100%" stop-color="#050e18"></stop>
            </linearGradient>
            <linearGradient id="rimGrad" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stop-color="#334155"></stop>
              <stop offset="100%" stop-color="#1e293b"></stop>
            </linearGradient>
            <linearGradient id="neonGreen" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stop-color="#4ade80"></stop>
              <stop offset="100%" stop-color="#16a34a"></stop>
            </linearGradient>
            <filter height="140%" id="glowFilter" width="140%" x="-20%" y="-20%">
              <feGaussianBlur result="blur" stdDeviation="4"></feGaussianBlur>
              <feComposite in="SourceGraphic" in2="blur" operator="over"></feComposite>
            </filter>
          </defs>

          <!-- Ambient background glow -->
          <circle cx="160" cy="160" fill="url(#vaultGlow)" r="130"></circle>
          <circle class="vault-ambient-glow" cx="160" cy="160" fill="none" r="120" stroke="#22c55e" stroke-dasharray="6 8" stroke-width="1.5"></circle>

          <!-- Outer Vault Heavy Bezel -->
          <circle cx="160" cy="160" fill="url(#rimGrad)" r="110" stroke="#334155" stroke-width="3"></circle>

          <!-- Outer Bolt Studs -->
          <g fill="#64748b">
            <circle cx="160" cy="58" r="4.5"></circle>
            <circle cx="232" cy="88" r="4.5"></circle>
            <circle cx="262" cy="160" r="4.5"></circle>
            <circle cx="232" cy="232" r="4.5"></circle>
            <circle cx="160" cy="262" r="4.5"></circle>
            <circle cx="88" cy="232" r="4.5"></circle>
            <circle cx="58" cy="160" r="4.5"></circle>
            <circle cx="88" cy="88" r="4.5"></circle>
          </g>

          <!-- Stepped Vault Chamber Door -->
          <circle cx="160" cy="160" fill="url(#doorGrad)" r="94" stroke="#1e293b" stroke-width="4"></circle>

          <!-- Encrypted Code Notches Ring -->
          <circle cx="160" cy="160" fill="none" r="82" stroke="#22c55e" stroke-dasharray="3 7" stroke-opacity="0.3" stroke-width="2"></circle>

          <!-- Rotating Mechanism / Spokes -->
          <g class="vault-wheel-assembly">
            <circle cx="160" cy="160" fill="#0f172a" r="54" stroke="#475569" stroke-width="5"></circle>
            <line stroke="#64748b" stroke-linecap="round" stroke-width="6" x1="160" x2="160" y1="110" y2="76"></line>
            <line stroke="#64748b" stroke-linecap="round" stroke-width="6" x1="160" x2="160" y1="210" y2="244"></line>
            <line stroke="#64748b" stroke-linecap="round" stroke-width="6" x1="110" x2="76" y1="160" y2="160"></line>
            <line stroke="#64748b" stroke-linecap="round" stroke-width="6" x1="210" x2="244" y1="160" y2="160"></line>
            <circle cx="160" cy="74" fill="#22c55e" r="5.5"></circle>
            <circle cx="160" cy="246" fill="#22c55e" r="5.5"></circle>
            <circle cx="74" cy="160" fill="#22c55e" r="5.5"></circle>
            <circle cx="246" cy="160" fill="#22c55e" r="5.5"></circle>
            <line stroke="#94a3b8" stroke-linecap="round" stroke-width="4" x1="130" x2="190" y1="130" y2="190"></line>
            <line stroke="#94a3b8" stroke-linecap="round" stroke-width="4" x1="130" x2="190" y1="190" y2="130"></line>
          </g>

          <!-- Center Encrypted Hub & Success Shield -->
          <circle cx="160" cy="160" fill="#051424" filter="url(#glowFilter)" r="38" stroke="url(#neonGreen)" stroke-width="3"></circle>

          <!-- Success Checkmark and Enclave Badge -->
          <g class="vault-success-badge">
            <circle cx="160" cy="160" fill="#22c55e" fill-opacity="0.15" r="26"></circle>
            <path class="vault-check-path" d="M149 160.5 L157 168.5 L173 151.5" fill="none" stroke="#4ade80" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5"></path>
          </g>

          <!-- Floating Sparkles -->
          <g fill="#4ade80">
            <circle class="vault-sparkle-1" cx="64" cy="115" r="2"></circle>
            <circle class="vault-sparkle-2" cx="254" cy="120" r="2.5"></circle>
            <circle class="vault-sparkle-3" cx="190" cy="50" r="1.8"></circle>
            <circle class="vault-sparkle-1" cx="120" cy="265" r="2.2"></circle>
            <circle class="vault-sparkle-2" cx="240" cy="240" r="1.8"></circle>
          </g>
        </svg>
      </div>
    `;

    return (
      <View
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        // @ts-ignore
        dangerouslySetInnerHTML={{ __html: rawSvgHtml }}
      />
    );
  }

  // Native React Native implementation: Layered with Animated.View for rock-solid Fabric rendering
  const rotateDeg = rotateAnim.interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Layer 1: Ambient Glow & Outer Vault Door Assembly */}
      <Svg width={size} height={size} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient cx="50%" cy="50%" id="vaultGlow" r="50%">
            <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <Stop offset="60%" stopColor="#22c55e" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="doorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1e293b" />
            <Stop offset="50%" stopColor="#0f172a" />
            <Stop offset="100%" stopColor="#050e18" />
          </LinearGradient>
          <LinearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#334155" />
            <Stop offset="100%" stopColor="#1e293b" />
          </LinearGradient>
        </Defs>

        {/* Ambient glow */}
        <Circle cx="160" cy="160" r="130" fill="url(#vaultGlow)" />
        <Circle
          cx="160"
          cy="160"
          r="120"
          fill="none"
          stroke="#22c55e"
          strokeDasharray="6,8"
          strokeWidth="1.5"
          opacity={0.5}
        />

        {/* Outer Vault Bezel */}
        <Circle cx="160" cy="160" r="110" fill="url(#rimGrad)" stroke="#334155" strokeWidth="3" />

        {/* Outer Bolts */}
        <G fill="#64748b">
          <Circle cx="160" cy="58" r="4.5" />
          <Circle cx="232" cy="88" r="4.5" />
          <Circle cx="262" cy="160" r="4.5" />
          <Circle cx="232" cy="232" r="4.5" />
          <Circle cx="160" cy="262" r="4.5" />
          <Circle cx="88" cy="232" r="4.5" />
          <Circle cx="58" cy="160" r="4.5" />
          <Circle cx="88" cy="88" r="4.5" />
        </G>

        {/* Vault Door */}
        <Circle cx="160" cy="160" r="94" fill="url(#doorGrad)" stroke="#1e293b" strokeWidth="4" />
        <Circle
          cx="160"
          cy="160"
          r="82"
          fill="none"
          stroke="#22c55e"
          strokeDasharray="3,7"
          strokeOpacity="0.3"
          strokeWidth="2"
        />
      </Svg>

      {/* Layer 2: Rotating Spokes Wheel (Animated.View rotated natively) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: rotateDeg }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 320 320">
          <Circle cx="160" cy="160" r="54" fill="#0f172a" stroke="#475569" strokeWidth="5" />
          <Line x1="160" y1="110" x2="160" y2="76" stroke="#64748b" strokeLinecap="round" strokeWidth="6" />
          <Line x1="160" y1="210" x2="160" y2="244" stroke="#64748b" strokeLinecap="round" strokeWidth="6" />
          <Line x1="110" y1="160" x2="76" y2="160" stroke="#64748b" strokeLinecap="round" strokeWidth="6" />
          <Line x1="210" y1="160" x2="244" y2="160" stroke="#64748b" strokeLinecap="round" strokeWidth="6" />
          <Circle cx="160" cy="74" r="5.5" fill="#22c55e" />
          <Circle cx="160" cy="246" r="5.5" fill="#22c55e" />
          <Circle cx="74" cy="160" r="5.5" fill="#22c55e" />
          <Circle cx="246" cy="160" r="5.5" fill="#22c55e" />
          <Line x1="130" y1="130" x2="190" y2="190" stroke="#94a3b8" strokeLinecap="round" strokeWidth="4" />
          <Line x1="130" y1="190" x2="190" y2="130" stroke="#94a3b8" strokeLinecap="round" strokeWidth="4" />
        </Svg>
      </Animated.View>

      {/* Layer 3: Center Hub & Checkmark Success Badge */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: scaleBadgeAnim }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 320 320">
          <Defs>
            <LinearGradient id="neonGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4ade80" />
              <Stop offset="100%" stopColor="#16a34a" />
            </LinearGradient>
          </Defs>

          {/* Center Hub */}
          <Circle cx="160" cy="160" r="38" fill="#051424" stroke="url(#neonGreen)" strokeWidth="3" />

          {/* Center Badge & Checkmark */}
          <Circle cx="160" cy="160" r="26" fill="#22c55e" fillOpacity="0.15" />
          <Path
            d="M149 160.5 L157 168.5 L173 151.5"
            fill="none"
            stroke="#4ade80"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
          />

          {/* Sparkles */}
          <G fill="#4ade80">
            <Circle cx="64" cy="115" r="2" />
            <Circle cx="254" cy="120" r="2.5" />
            <Circle cx="190" cy="50" r="1.8" />
            <Circle cx="120" cy="265" r="2.2" />
            <Circle cx="240" cy="240" r="1.8" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
