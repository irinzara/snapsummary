import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

const WaveBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e0c, 0.02); // Deep fog to blend into background

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    // Position camera to look across the sweeping wave landscape
    camera.position.set(30, 20, 60);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.setClearColor(0x0a0e0c, 1);
    mountRef.current.appendChild(renderer.domElement);

    // Advanced Post-Processing Bloom for intense glowing peaks
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 2.0, 0.5, 0.1);
    bloomPass.tintColor = new THREE.Color(0x2ecc71);
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Geometry - High resolution plane
    const geometry = new THREE.PlaneGeometry(200, 200, 300, 300);
    geometry.rotateX(-Math.PI / 2);

    const vertexShader = `
      uniform float time;
      varying float vElevation;
      varying vec2 vUv;

      // Classic Perlin 3D Noise 
      // by Stefan Gustavson
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
      vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

      float cnoise(vec3 P){
        vec3 Pi0 = floor(P); // Integer part for indexing
        vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P); // Fractional part for interpolation
        vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
        return 2.2 * n_xyz;
      }

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Flowing noise displacement
        float noiseFreq = 0.05;
        float noiseAmp = 12.0;
        vec3 noisePos = vec3(pos.x * noiseFreq + time * 0.2, pos.z * noiseFreq - time * 0.1, time * 0.2);
        float elevation = cnoise(noisePos) * noiseAmp;
        
        // Add a secondary sweeping wave
        elevation += sin(pos.x * 0.1 + time) * 4.0;
        elevation += cos(pos.z * 0.08 - time * 0.8) * 3.0;

        pos.y += elevation;
        vElevation = pos.y;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      varying float vElevation;
      varying vec2 vUv;

      void main() {
        // Draw fine flowing lines based on UVs
        // We use fract to repeat the lines, and smoothstep for softness
        float lines = smoothstep(0.0, 0.08, abs(fract(vUv.x * 300.0) - 0.5));
        
        // Base dark green/black
        vec3 colorBase = vec3(0.01, 0.08, 0.03);
        // Intense bright white-green for the peaks
        vec3 colorHigh = vec3(0.7, 1.0, 0.85);
        
        // Mix color based on elevation height
        float mixVal = smoothstep(-5.0, 15.0, vElevation);
        vec3 finalColor = mix(colorBase, colorHigh, mixVal);
        
        // Alpha is based on the lines to make them look like a ribbon mesh
        float alpha = 1.0 - lines;
        
        gl_FragColor = vec4(finalColor * alpha, alpha * mixVal * 1.5);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -10;
    mesh.position.x = 20; // Shift right
    scene.add(mesh);

    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      material.uniforms.time.value = clock.getElapsedTime();
      composer.render();
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const onWindowResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer.setSize(nw, nh);
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      composer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />;
};

export default WaveBackground;
