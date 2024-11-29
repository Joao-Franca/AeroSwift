CREATE TABLE gestor (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    usuario VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    usuario VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE fazendas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    imagem VARCHAR(255) NOT NULL UNIQUE,
	mapa VARCHAR(255) NOT NULL UNIQUE
);


SELECT * FROM fazendas;
CREATE TABLE tipooperacao (
    id SERIAL PRIMARY KEY,
    tipo_operação VARCHAR(100) NOT NULL
);

CREATE TABLE drone (
    id SERIAL PRIMARY KEY,
    modelo_drone VARCHAR(100) NOT NULL
);

CREATE TABLE detalhamento (
    id SERIAL PRIMARY KEY,
    fazenda_id INT REFERENCES fazendas(id),
    tipo_operação_id INT REFERENCES tipooperação(id),
    modelo_drone_id INT REFERENCES drone(id),
    colaborador_id INT REFERENCES usuario(id),
    data DATE NOT NULL
);

CREATE TABLE servico (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    fazenda VARCHAR(100) NOT NULL),
    servico VARCHAR(100) NOT NULL,
    drone VARCHAR(100) NOT NULL,
    colaborador VARCHAR(100) NOT NULL 
);

CREATE OR REPLACE FUNCTION atualizar_status_servico()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data = CURRENT_DATE THEN
        NEW.status := 'Em andamento';
    ELSE
        NEW.status := 'Pendente';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_status_servico
BEFORE INSERT OR UPDATE ON servico
FOR EACH ROW
EXECUTE FUNCTION atualizar_status_servico();


CREATE TABLE operacoes (
    id SERIAL PRIMARY KEY,
    fazenda_id INT REFERENCES fazendas(id),
    data DATE NOT NULL,
    status VARCHAR(50) NOT NULL
);