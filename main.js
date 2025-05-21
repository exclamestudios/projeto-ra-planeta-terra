import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import * as gsap from 'gsap';

// Elementos da UI
const startButton = document.getElementById('startButton');
const arView = document.getElementById('arView');
const descricao = document.getElementById('descricao');
const loading = document.getElementById('loading');
const playButton = document.getElementById('playButton');
const playIcon = playButton.querySelector('.play-icon');
const pauseIcon = playButton.querySelector('.pause-icon');

// Configuração do áudio
const audioListener = new THREE.AudioListener();
let audio = null;
let isPlaying = false;

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
camera.add(audioListener);

// Adiciona iluminação à cena
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// Configura o renderizador
console.log('Configurando renderizador');
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance' // Prioriza performance
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita o pixel ratio
renderer.outputEncoding = THREE.sRGBEncoding; // Configura o encoding do renderer
arView.appendChild(renderer.domElement);
console.log('Renderizador configurado');

// Cria o anchor e o plano com a textura
const anchor = mindarThree.addAnchor(0);
let terraPlane = null;

// Carrega a textura da carta
console.log('Carregando textura da carta');
const textureLoader = new THREE.TextureLoader();
textureLoader.load(
  './img/carta-terra.png',
  (texture) => {
    console.log('Textura carregada com sucesso');
    
    // Ajusta o encoding da textura
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    
    // Cria o plano com a textura
    const geometry = new THREE.PlaneGeometry(1, 0.55); // Proporção 1:0.55
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    terraPlane = new THREE.Mesh(geometry, material);
    terraPlane.visible = false;
    anchor.group.add(terraPlane);
    
    // Adiciona rotação contínua ao plano
    gsap.to(terraPlane.rotation, {
      y: Math.PI * 2,
      duration: 20,
      repeat: -1,
      ease: "none"
    });
  },
  // Progresso do carregamento
  (xhr) => {
    const percent = (xhr.loaded / xhr.total) * 100;
    console.log(`Carregando textura: ${percent.toFixed(2)}%`);
    loading.textContent = `Carregando textura: ${percent.toFixed(0)}%`;
  },
  // Erro no carregamento
  (error) => {
    loading.textContent = '❌ Erro ao carregar textura';
    console.error('Erro ao carregar textura:', error);
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
      
      // Anima a descrição
      gsap.to(descricao, {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out"
      });

      // Mostra o plano com a textura
      if (terraPlane) {
        terraPlane.visible = true;
        gsap.from(terraPlane.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          ease: "elastic.out(1, 0.3)"
        });
      }
    };

    anchor.onTargetLost = () => {
      console.log('Marcador perdido');
      loading.style.display = 'block';
      
      // Anima a descrição
      gsap.to(descricao, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in"
      });

      // Esconde o plano com a textura
      if (terraPlane) {
        terraPlane.visible = false;
      }

      // Pausa o áudio se estiver tocando
      if (audio && isPlaying) {
        audio.pause();
        isPlaying = false;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
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

// Evento de clique no botão de play/pause
playButton.addEventListener('click', () => {
  if (!audio) {
    // Carrega o áudio na primeira vez
    audio = new THREE.Audio(audioListener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('./audio/narracao.mp3', (buffer) => {
      audio.setBuffer(buffer);
      audio.setLoop(true);
      audio.setVolume(0.5);
      toggleAudio();
    });
  } else {
    toggleAudio();
  }
});

function toggleAudio() {
  if (isPlaying) {
    audio.pause();
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  } else {
    audio.play();
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  }
  isPlaying = !isPlaying;
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