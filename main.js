import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Elementos da UI
const startButton = document.getElementById('startButton');
const arView = document.getElementById('arView');
const descricao = document.getElementById('descricao');
const loading = document.getElementById('loading');

console.log('Script carregado');

// Função para verificar se o arquivo existe
async function checkFileExists(url) {
  try {
    console.log('Verificando arquivo:', url);
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
console.log('Inicializando MindAR');
const mindarThree = new MindARThree({
  container: arView,
  imageTargetSrc: './mind/terra.mind',
  maxTrack: 1,
  maxTargets: 1,
  warmupTolerance: 20,        // Aumenta ainda mais a tolerância no aquecimento
  missTolerance: 20,          // Aumenta ainda mais a tolerância para perda do marcador
  minDetectionConfidence: 0.4, // Reduz significativamente a confiança mínima para permitir detecção à distância
  minTrackingConfidence: 0.4,  // Reduz significativamente a confiança mínima de tracking
  debug: true,                // Ativa o modo debug para ver informações de tracking
  uiDebug: true,              // Mostra informações de debug na tela
  uiLoading: "no",            // Desativa o overlay de loading padrão
  uiScanning: "no",           // Desativa o overlay de scanning padrão
  uiError: "no"               // Desativa o overlay de erro padrão
});
console.log('MindAR inicializado');

// Obtém a cena e a câmera
const { scene, camera } = mindarThree;

// Configura o renderizador
console.log('Configurando renderizador');
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance' // Prioriza performance
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita o pixel ratio
arView.appendChild(renderer.domElement);
console.log('Renderizador configurado');

// Cria o plano que marca a área do marcador
const anchor = mindarThree.addAnchor(0);
const geometry = new THREE.PlaneGeometry(1, 0.55);
const material = new THREE.MeshBasicMaterial({ 
  color: 0x00ffff, 
  transparent: true, 
  opacity: 0.5,
  side: THREE.DoubleSide
});
const plane = new THREE.Mesh(geometry, material);
anchor.group.add(plane);

// Carrega o modelo 3D
console.log('Iniciando carregamento do modelo 3D');
const gltfLoader = new GLTFLoader();
let model = null;

gltfLoader.load(
  './3d/terra/scene.gltf',
  (gltf) => {
    console.log('Modelo 3D carregado com sucesso');
    model = gltf.scene;
    
    // Ajusta o tamanho do modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.5 / maxDim; // Ajusta para ter 0.5 unidades de tamanho
    model.scale.set(scale, scale, scale);
    
    // Centraliza o modelo
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));
    
    // Adiciona o modelo ao anchor
    anchor.group.add(model);
    model.visible = false; // Começa invisível
  },
  undefined,
  (error) => {
    loading.textContent = '❌ Erro ao carregar modelo 3D';
    console.error('Erro ao carregar modelo 3D:', error);
  }
);

// Função para iniciar a AR
async function startAR() {
  try {
    console.log('Iniciando AR');
    
    // Verifica se o arquivo .mind existe
    console.log('Verificando arquivo .mind');
    const mindFileExists = await checkFileExists('./mind/terra.mind');
    if (!mindFileExists) {
      throw new Error('Arquivo .mind não encontrado');
    }

    // Esconde o botão e mostra a view AR
    console.log('Atualizando UI');
    startButton.style.display = 'none';
    arView.style.display = 'block';
    loading.style.display = 'block';
    descricao.style.opacity = '0';

    // Configura os eventos antes de iniciar
    anchor.onTargetFound = () => {
      console.log('Marcador encontrado');
      loading.style.display = 'none';
      descricao.style.opacity = '1';
      if (model) {
        model.visible = true;
      }
    };

    anchor.onTargetLost = () => {
      console.log('Marcador perdido');
      loading.style.display = 'block';
      descricao.style.opacity = '0';
      if (model) {
        model.visible = false;
      }
    };

    // Adiciona eventos de tracking
    anchor.onTargetUpdate = (target) => {
      const confidence = target.detectionConfidence;
      console.log(`Confiança de detecção: ${(confidence * 100).toFixed(1)}%`);
      
      // Atualiza a mensagem de loading com a confiança
      if (confidence < 0.4) {
        loading.textContent = `🔍 Procurando marcador... (${(confidence * 100).toFixed(1)}%)`;
      } else {
        loading.textContent = `✅ Marcador detectado! (${(confidence * 100).toFixed(1)}%)`;
      }
    };

    // Inicia o MindAR
    console.log('Iniciando MindAR');
    await mindarThree.start();
    console.log('MindAR iniciado com sucesso');

    // Inicia o loop de renderização
    console.log('Iniciando loop de renderização');
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
console.log('Adicionando evento de clique');
startButton.addEventListener('click', startAR);

// Ajusta o tamanho da janela
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});