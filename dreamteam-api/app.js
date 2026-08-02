const express = require("express");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const CARTAS_DIR = path.join(__dirname, "cartas");
const CAMPOS_DIR = path.join(__dirname, "campos");

const CARD_W = 150;
const CARD_H = 210;

const EXTENSOES = [".png", ".jpg", ".jpeg", ".webp"];

// =========================
// CONFIG DAS FORMAÇÕES
// =========================
const FORMACOES = {
  "111": {
    arquivoCampo: "111",
    posicoes: {
      ata1: { x: 563, y: 305 },
      mei1: { x: 563, y: 620 },
      def1: { x: 563, y: 930 },
      gol:  { x: 563, y: 1185 }
    }
  },

  "201": {
    arquivoCampo: "201",
    posicoes: {
      ata1: { x: 563, y: 305 },
      def1: { x: 410, y: 700 },
      def2: { x: 716, y: 700 },
      gol:  { x: 563, y: 1185 }
    }
  },

  "012": {
    arquivoCampo: "012",
    posicoes: {
      ata1: { x: 410, y: 305 },
      ata2: { x: 716, y: 305 },
      mei1: { x: 563, y: 620 },
      gol:  { x: 563, y: 1185 }
    }
  },

  "021": {
    arquivoCampo: "021",
    posicoes: {
      ata1: { x: 563, y: 305 },
      mei1: { x: 410, y: 700 },
      mei2: { x: 716, y: 700 },
      gol:  { x: 563, y: 1185 }
    }
  }
};

// =========================
// FUNÇÕES AUXILIARES
// =========================
function acharArquivoSemExtensao(pasta, nomeBase) {
  for (const ext of EXTENSOES) {
    const caminho = path.join(pasta, `${nomeBase}${ext}`);
    if (fs.existsSync(caminho)) {
      return caminho;
    }
  }
  return null;
}

function desenharCartaCentralizada(ctx, img, centroX, centroY, largura, altura) {
  const x = centroX - largura / 2;
  const y = centroY - altura / 2;
  ctx.drawImage(img, x, y, largura, altura);
}

async function desenharCartaSeExistir(ctx, idCarta, posicao) {
  if (!idCarta || !posicao) return;

  const id = String(idCarta).trim();
  const caminhoCarta = acharArquivoSemExtensao(CARTAS_DIR, id);

  if (!caminhoCarta) {
    console.log(`Carta não encontrada: ${id}`);
    return;
  }

  const imgCarta = await loadImage(caminhoCarta);
  desenharCartaCentralizada(ctx, imgCarta, posicao.x, posicao.y, CARD_W, CARD_H);
}

// =========================
// ROTA INICIAL
// =========================
app.get("/", (req, res) => {
  res.send(`
    <h2>DreamTeam API online</h2>
    <p>Use a rota <code>/time</code> para gerar uma imagem do time.</p>

    <p><strong>Exemplo:</strong></p>
    <pre>/time?formacao=111&gol=009&def1=010&mei1=011&ata1=012</pre>

    <p><strong>Formações disponíveis:</strong> 111, 201, 012, 021</p>
  `);
});

// =========================
// ROTA DE GERAR TIME
// =========================
app.get("/time", async (req, res) => {
  try {
    const formacao = String(req.query.formacao || "").trim();

    if (!FORMACOES[formacao]) {
      return res.status(400).send("Formação inválida. Use: 111, 201, 012 ou 021.");
    }

    const configFormacao = FORMACOES[formacao];
    const caminhoCampo = acharArquivoSemExtensao(CAMPOS_DIR, configFormacao.arquivoCampo);

    if (!caminhoCampo) {
      return res.status(500).send(`Imagem do campo da formação ${formacao} não foi encontrada na pasta /campos.`);
    }

    const imgCampo = await loadImage(caminhoCampo);

    const canvas = createCanvas(imgCampo.width, imgCampo.height);
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // desenha o campo
    ctx.drawImage(imgCampo, 0, 0, imgCampo.width, imgCampo.height);

    // pega as posições da formação
    const pos = configFormacao.posicoes;

    // lê as cartas da URL
    const gol = req.query.gol;
    const def1 = req.query.def1;
    const def2 = req.query.def2;
    const mei1 = req.query.mei1;
    const mei2 = req.query.mei2;
    const ata1 = req.query.ata1;
    const ata2 = req.query.ata2;

    // desenha cada carta, se existir
    await desenharCartaSeExistir(ctx, gol, pos.gol);
    await desenharCartaSeExistir(ctx, def1, pos.def1);
    await desenharCartaSeExistir(ctx, def2, pos.def2);
    await desenharCartaSeExistir(ctx, mei1, pos.mei1);
    await desenharCartaSeExistir(ctx, mei2, pos.mei2);
    await desenharCartaSeExistir(ctx, ata1, pos.ata1);
    await desenharCartaSeExistir(ctx, ata2, pos.ata2);

    res.setHeader("Content-Type", "image/png");
    res.send(canvas.toBuffer("image/png"));
  } catch (erro) {
    console.error("Erro ao gerar imagem:", erro);
    res.status(500).send("Erro interno ao gerar a imagem do time.");
  }
});

// =========================
// START
// =========================
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});