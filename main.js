import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');
  const arView      = document.getElementById('arView');
  const descricao   = document.getElementById('descricao');
  const loading     = document.getElementById('loading');

  startButton.addEventListener('click', async () => {
    startButton.style.display = 'none';
    arView.style.display      = 'block';
    loading.style.display     = 'block';

    try {
      const mindarThree = new MindARThree({
        container: arView,
        imageTargetSrc: './mind/terra.mind',
        maxTrack: 1
      });
      const { renderer, scene, camera } = mindarThree;

      // Cria o planeta Terra
      const texture = new THREE.TextureLoader().load('./img/terra.jpg');
      const geom    = new THREE.SphereGeometry(0.5, 32, 32);
      const mat     = new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.5, metalness: 0.1
      });
      const planet  = new THREE.Mesh(geom, mat);
      planet.rotation.y = Math.PI / 2;
      scene.add(planet);

      // Luz ambiente + direcional
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(0, 0, 1);
      scene.add(dirLight);

      // Quando detecta/perde marcador
      mindarThree.onTargetFound = () => {
        descricao.style.opacity = 1;
        loading.style.display   = 'none';
      };
      mindarThree.onTargetLost = () => {
        descricao.style.opacity = 0;
        loading.style.display   = 'block';
      };

      // Inicia AR e loop de render
      await mindarThree.start();
      renderer.setAnimationLoop(() => {
        planet.rotation.y += 0.005;
        renderer.render(scene, camera);
      });

    } catch (err) {
      console.error(err);
      loading.textContent = `Erro: ${err.message}`;
      loading.style.background = 'rgba(255,0,0,0.7)';
      startButton.style.display = 'block';
    }
  });
});