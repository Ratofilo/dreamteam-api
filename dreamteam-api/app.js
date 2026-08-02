const express = require("express");
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");

const app = express();
const PORT = process.env.PORT || 3000;

// Tamanho final de cada carta no campo
const CARD_W = 150;
const CARD_H = 210;

// As imagens estão dentro da pasta assets
const CAMPOS_DIR = path.join(__dirname, "assets", "campos");
const CARTAS_DIR = path.join(__dirname, "assets", "cartas");

// Coordenadas representam o centro de cada carta
const POSICOES = {
  "111": {
    gol: { x: 550, y: 930 },
    def1: { x: 550, y: 720 },
    mei1: { x: 550, y: 510 },
    ata1: { x: 550, y: 315 }
  },

  "201": {
    gol: { x: 550, y: 930 },
    def1: { x: 360, y: 760 },
    def2: { x: 740, y: 760 },
    ata1: { x: 550, y: 315 }
  },

  "012": {
    gol: { x: 550, y: 930 },
    mei1: { x: 550, y: 510 },
    ata1: { x: 395, y: 315 },
    ata2: { x: 705, y: 315 }
  },

  "021": {
    gol: { x: 550, y: 930 },
    mei1: { x: 410, y: 615 },
    mei2: { x: 690, y: 615 },
    ata1: { x: 550, y: 315 }
  }
};

function caminhoCampo(formacao) {
  return path.join(CAMPOS_DIR, `${formacao}.png`);
}

function normalizarIdCarta(id) {
  if (!id) return null;

  const valor = String(id).trim();

  if (
    valor === "" ||
    valor === "0" ||
    valor === "00" ||
    valor === "000"
  ) {
    return null;
  }

  return valor.padStart(3, "0");
}

function caminhoCarta(id) {
  const idNormalizado = normalizarIdCarta(id);

  if (!idNormalizado) {
    return null;
  }

  return path.join(CARTAS_DIR, `${idNormalizado}.png`);
}

async function sobreporCarta(imagemBase, idCarta, posicao) {
  if (!idCarta || !posicao) {
    return;
  }

  const arquivoCarta = caminhoCarta(idCarta);

  if (!arquivoCarta) {
    return;
  }

  if (!fs.existsSync(arquivoCarta)) {
    console.log(`Carta não encontrada: ${arquivoCarta}`);
    return;
  }

  const carta = await Jimp.read(arquivoCarta);

  carta.resize(CARD_W, CARD_H);

  const x = Math.round(posicao.x - CARD_W / 2);
  const y = Math.round(posicao.y - CARD_H / 2);

  imagemBase.composite(carta, x, y);
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API DreamTeam funcionando",
    formacoes: ["111", "201", "012", "021"],
    exemplo:
      "/time?formacao=111&gol=009&def1=010&mei1=011&ata1=012"
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/time", async (req, res) => {
  try {
    const formacao = String(req.query.formacao || "").trim();

    if (!formacao) {
      return res.status(400).send(
        "Informe a formação. Exemplo: ?formacao=111"
      );
    }

    if (!POSICOES[formacao]) {
      return res.status(400).send(
        "Formação inválida. Use 111, 201, 012 ou 021."
      );
    }

    const arquivoCampo = caminhoCampo(formacao);

    if (!fs.existsSync(arquivoCampo)) {
      return res.status(404).send(
        `Campo não encontrado: assets/campos/${formacao}.png`
      );
    }

    const imagemBase = await Jimp.read(arquivoCampo);
    const posicoes = POSICOES[formacao];

    await sobreporCarta(
      imagemBase,
      req.query.gol,
      posicoes.gol
    );

    await sobreporCarta(
      imagemBase,
      req.query.def1,
      posicoes.def1
    );

    await sobreporCarta(
      imagemBase,
      req.query.def2,
      posicoes.def2
    );

    await sobreporCarta(
      imagemBase,
      req.query.mei1,
      posicoes.mei1
    );

    await sobreporCarta(
      imagemBase,
      req.query.mei2,
      posicoes.mei2
    );

    await sobreporCarta(
      imagemBase,
      req.query.ata1,
      posicoes.ata1
    );

    await sobreporCarta(
      imagemBase,
      req.query.ata2,
      posicoes.ata2
    );

    const buffer = await imagemBase.getBufferAsync(Jimp.MIME_PNG);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    return res.send(buffer);
  } catch (error) {
    console.error("Erro ao gerar o time:", error);

    return res.status(500).send(
      `Erro ao gerar a imagem: ${error.message}`
    );
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API DreamTeam online na porta ${PORT}`);
});