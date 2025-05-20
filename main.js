import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

// Elementos da UI
const startButton = document.getElementById('startButton');
const arView = document.getElementById('arView');
const descricao = document.getElementById('descricao');
const loading = document.getElementById('loading');

// Inicializa o MindAR
const mindarThree = new MindARThree({
  container: arView,
  imageTargetSrc: './mind/terra.mind',
  uiLoading: 'none',
  uiScanning: 'none',
  uiError: 'none',
});

// Obtém a cena e a câmera
const { scene, camera } = mindarThree;

// Configura o renderizador
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
arView.appendChild(renderer.domElement);

// Carrega a textura da Terra
const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = 'anonymous';

textureLoader.load(
  './img/terra.jpg',
  (texture) => {
    // Cria a geometria da Terra
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    const earth = new THREE.Mesh(geometry, material);
    
    // Adiciona a Terra à cena
    scene.add(earth);
  },
  undefined,
  (error) => {
    loading.textContent = '❌ Erro ao carregar imagem';
  }
);

// Função para iniciar a AR
async function startAR() {
  try {
    // Esconde o botão e mostra a view AR
    startButton.style.display = 'none';
    arView.style.display = 'block';
    loading.style.display = 'block';
    descricao.style.opacity = '0';

    // Inicia o MindAR
    await mindarThree.start();

    // Adiciona eventos de detecção do marcador
    mindarThree.onTargetFound = () => {
      loading.style.display = 'none';
      descricao.style.opacity = '1';
    };

    mindarThree.onTargetLost = () => {
      loading.style.display = 'block';
      descricao.style.opacity = '0';
    };

    // Inicia o loop de renderização
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

  } catch (error) {
    loading.textContent = `❌ Erro: ${error.message || 'Desconhecido'}`;
    startButton.style.display = 'block';
  }
}

// Evento de clique no botão
startButton.addEventListener('click', startAR);

// Ajusta o tamanho da janela
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});