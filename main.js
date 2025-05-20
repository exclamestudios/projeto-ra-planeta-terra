import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

// Elementos da UI
const startButton = document.getElementById('startButton');
const arView = document.getElementById('arView');
const descricao = document.getElementById('descricao');
const loading = document.getElementById('loading');

// Função para verificar se o arquivo existe
async function checkFileExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Arquivo não encontrado: ${url} (${response.status})`);
    }
    console.log(`Arquivo encontrado: ${url}`);
    return true;
  } catch (error) {
    console.error(`Erro ao verificar arquivo ${url}:`, error);
    return false;
  }
}

// Inicializa o MindAR
const mindarThree = new MindARThree({
  container: arView,
  imageTargetSrc: './mind/terra.mind',
  maxTrack: 1
  // sem uiLoading/uiScanning/uiError → aparecerá o retículo + linha automaticamente
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
    console.error('Erro ao carregar textura:', error);
  }
);

// Função para iniciar a AR
async function startAR() {
  try {
    // Verifica se o arquivo .mind existe
    const mindFileExists = await checkFileExists('./mind/terra.mind');
    if (!mindFileExists) {
      throw new Error('Arquivo .mind não encontrado');
    }

    // Esconde o botão e mostra a view AR
    startButton.style.display = 'none';
    arView.style.display = 'block';
    loading.style.display = 'block';
    descricao.style.opacity = '0';

    // Inicia o MindAR
    await mindarThree.start();
    console.log('MindAR iniciado com sucesso');

    // Adiciona eventos de detecção do marcador
    mindarThree.onTargetFound = () => {
      loading.style.display = 'none';
      descricao.style.opacity = '1';
      console.log('Marcador encontrado');
    };

    mindarThree.onTargetLost = () => {
      loading.style.display = 'block';
      descricao.style.opacity = '0';
      console.log('Marcador perdido');
    };

    // Inicia o loop de renderização
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

  } catch (error) {
    console.error('Erro ao iniciar AR:', error);
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