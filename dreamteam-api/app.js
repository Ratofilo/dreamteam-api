const express = require("express");
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// CONFIGURAÇÕES
// =========================

// Tamanho usado nas formações 201, 012 e 021
const DEFAULT_CARD_W = 230;
const DEFAULT_CARD_H = 326;

// Os campos já possuem 1400x1000.
// Não é necessário ampliar a imagem final.
const OUTPUT_SCALE = 1;

// Pastas
const CAMPOS_DIR = path.join(__dirname, "assets", "campos");
const CARTAS_DIR = path.join(__dirname, "assets", "cartas");

// Cache em memória
const cacheCampos = new Map();
const cacheCartas = new Map();

// =========================
// CONFIGURAÇÕES DAS FORMAÇÕES
// Campo: 1400x1000
// =========================

const FORMACOES = {
  "111": {
    // Cartas menores porque existem quatro linhas verticais
    cardW: 185,
    cardH: 262,

    posicoes: {
      gol: {
        x: 700,
        y: 820
      },

      def1: {
        x: 700,
        y: 620
      },

      mei1: {
        x: 700,
        y: 420
      },

      ata1: {
        x: 700,
        y: 210
      }
    }
  },

  "201": {
    cardW: 230,
    cardH: 326,

    posicoes: {
      gol: {
        x: 700,
        y: 820
      },

      def1: {
        x: 460,
        y: 570
      },

      def2: {
        x: 940,
        y: 570
      },

      ata1: {
        x: 700,
        y: 220
      }
    }
  },

  "012": {
    cardW: 230,
    cardH: 326,

    posicoes: {
      gol: {
        x: 700,
        y: 820
      },

      mei1: {
        x: 700,
        y: 530
      },

      ata1: {
        x: 460,
        y: 220
      },

      ata2: {
        x: 940,
        y: 220
      }
    }
  },

  "021": {
    cardW: 230,
    cardH: 326,

    posicoes: {
      gol: {
        x: 700,
        y: 820
      },

      mei1: {
        x: 460,
        y: 530
      },

      mei2: {
        x: 940,
        y: 530
      },

      ata1: {
        x: 700,
        y: 220
      }
    }
  }
};

// =========================
// FUNÇÕES AUXILIARES
// =========================

function caminhoCampo(formacao) {
  return path.join(CAMPOS_DIR, `${formacao}.png`);
}

function normalizarIdCarta(id) {
  if (id === undefined || id === null) {
    return null;
  }

  const valor = String(id).trim();

  if (
    valor === "" ||
    valor === "0" ||
    valor === "00" ||
    valor === "000" ||
    valor.toLowerCase() === "null" ||
    valor.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return valor.padStart(3, "0");
}

function caminhoCarta(idNormalizado) {
  return path.join(CARTAS_DIR, `${idNormalizado}.png`);
}

async function carregarCampo(formacao) {
  if (cacheCampos.has(formacao)) {
    return cacheCampos.get(formacao).clone();
  }

  const arquivoCampo = caminhoCampo(formacao);

  if (!fs.existsSync(arquivoCampo)) {
    throw new Error(
      `Campo não encontrado: assets/campos/${formacao}.png`
    );
  }

  const campo = await Jimp.read(arquivoCampo);

  cacheCampos.set(formacao, campo);

  return campo.clone();
}

async function carregarCarta(id, cardW, cardH) {
  const idNormalizado = normalizarIdCarta(id);

  if (!idNormalizado) {
    return null;
  }

  const chaveCache = `${idNormalizado}-${cardW}x${cardH}`;

  if (cacheCartas.has(chaveCache)) {
    return cacheCartas.get(chaveCache).clone();
  }

  const arquivoCarta = caminhoCarta(idNormalizado);

  if (!fs.existsSync(arquivoCarta)) {
    console.warn(`Carta não encontrada: ${arquivoCarta}`);
    return null;
  }

  const carta = await Jimp.read(arquivoCarta);

  carta.resize(
    cardW,
    cardH,
    Jimp.RESIZE_BICUBIC
  );

  cacheCartas.set(chaveCache, carta);

  return carta.clone();
}

function sobreporCarta(
  imagemBase,
  carta,
  posicao,
  cardW,
  cardH
) {
  if (!carta || !posicao) {
    return;
  }

  // As coordenadas representam o centro da carta
  const x = Math.round(posicao.x - cardW / 2);
  const y = Math.round(posicao.y - cardH / 2);

  imagemBase.composite(carta, x, y);
}

// =========================
// ROTAS
// =========================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    mensagem: "API DreamTeam funcionando",
    tamanhoCampo: "1400x1000",
    formacoes: ["111", "201", "012", "021"],
    exemplo:
      "/time?formacao=111&gol=009&def1=010&mei1=011&ata1=012"
  });
});

app.get("/health", (req, res) => {
  return res.status(200).send("OK");
});

app.get("/time", async (req, res) => {
  const inicio = Date.now();

  try {
    const formacao = String(
      req.query.formacao || ""
    ).trim();

    if (!formacao) {
      return res
        .status(400)
        .send(
          "Informe a formação. Exemplo: ?formacao=111"
        );
    }

    const config = FORMACOES[formacao];

    if (!config) {
      return res
        .status(400)
        .send(
          "Formação inválida. Use 111, 201, 012 ou 021."
        );
    }

    const cardW =
      config.cardW || DEFAULT_CARD_W;

    const cardH =
      config.cardH || DEFAULT_CARD_H;

    const posicoes = config.posicoes;

    const imagemBase =
      await carregarCampo(formacao);

    const [
      cartaGol,
      cartaDef1,
      cartaDef2,
      cartaMei1,
      cartaMei2,
      cartaAta1,
      cartaAta2
    ] = await Promise.all([
      carregarCarta(
        req.query.gol,
        cardW,
        cardH
      ),

      carregarCarta(
        req.query.def1,
        cardW,
        cardH
      ),

      carregarCarta(
        req.query.def2,
        cardW,
        cardH
      ),

      carregarCarta(
        req.query.mei1,
        cardW,
        cardH
      ),

      carregarCarta(
        req.query.mei2,
        cardW,
        cardH
      ),

      carregarCarta(
        req.query.ata1,
        cardW,
        cardH
      ),

      carregarCarta(
        req.query.ata2,
        cardW,
        cardH
      )
    ]);

    sobreporCarta(
      imagemBase,
      cartaGol,
      posicoes.gol,
      cardW,
      cardH
    );

    sobreporCarta(
      imagemBase,
      cartaDef1,
      posicoes.def1,
      cardW,
      cardH
    );

    sobreporCarta(
      imagemBase,
      cartaDef2,
      posicoes.def2,
      cardW,
      cardH
    );

    sobreporCarta(
      imagemBase,
      cartaMei1,
      posicoes.mei1,
      cardW,
      cardH
    );

    sobreporCarta(
      imagemBase,
      cartaMei2,
      posicoes.mei2,
      cardW,
      cardH
    );

    sobreporCarta(
      imagemBase,
      cartaAta1,
      posicoes.ata1,
      cardW,
      cardH
    );

    sobreporCarta(
      imagemBase,
      cartaAta2,
      posicoes.ata2,
      cardW,
      cardH
    );

    if (OUTPUT_SCALE > 1) {
      imagemBase.resize(
        imagemBase.bitmap.width * OUTPUT_SCALE,
        imagemBase.bitmap.height * OUTPUT_SCALE,
        Jimp.RESIZE_BICUBIC
      );
    }

    const buffer =
      await imagemBase.getBufferAsync(
        Jimp.MIME_PNG
      );

    res.setHeader(
      "Content-Type",
      "image/png"
    );

    res.setHeader(
      "Content-Length",
      buffer.length
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=60"
    );

    res.setHeader(
      "Content-Disposition",
      'inline; filename="time.png"'
    );

    console.log(
      `Time ${formacao} gerado em ${
        Date.now() - inicio
      } ms`
    );

    return res.status(200).send(buffer);
  } catch (error) {
    console.error(
      "Erro ao gerar o time:",
      error
    );

    return res
      .status(500)
      .send(
        `Erro ao gerar a imagem: ${error.message}`
      );
  }
});

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `API DreamTeam online na porta ${PORT}`
    );
  }
);