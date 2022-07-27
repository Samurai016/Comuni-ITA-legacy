-- phpMyAdmin SQL Dump
-- version 5.1.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Creato il: Gen 06, 2022 alle 22:09
-- Versione del server: 10.4.19-MariaDB
-- Versione PHP: 7.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `comuni-ita`
--
CREATE DATABASE IF NOT EXISTS `comuni-ita` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `comuni-ita`;

-- --------------------------------------------------------

--
-- Struttura della tabella `comuni`
--

CREATE TABLE `comuni` (
  `codice` varchar(10) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `nomeStraniero` varchar(100) DEFAULT NULL,
  `codiceCatastale` varchar(5) DEFAULT NULL,
  `cap` char(5) DEFAULT NULL,
  `prefisso` varchar(10) DEFAULT NULL,
  `lat` float DEFAULT NULL,
  `lng` float DEFAULT NULL,
  `provincia` varchar(4) DEFAULT NULL
  `email` varchar(100) DEFAULT NULL,
  `pec` varchar(100) DEFAULT NULL,
  `telefono` varchar(100) DEFAULT NULL,
  `fax` varchar(100) DEFAULT NULL,
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Struttura della tabella `province`
--

CREATE TABLE `province` (
  `codice` varchar(4) NOT NULL,
  `nome` varchar(50) NOT NULL,
  `sigla` char(2) DEFAULT NULL,
  `regione` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Struttura della tabella `regioni`
--

CREATE TABLE `regioni` (
  `nome` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `comuni`
--
ALTER TABLE `comuni`
  ADD PRIMARY KEY (`codice`),
  ADD KEY `foregin_comuni_province` (`provincia`);

--
-- Indici per le tabelle `province`
--
ALTER TABLE `province`
  ADD PRIMARY KEY (`codice`),
  ADD KEY `foreign_province_regioni` (`regione`);

--
-- Indici per le tabelle `regioni`
--
ALTER TABLE `regioni`
  ADD PRIMARY KEY (`nome`);

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `comuni`
--
ALTER TABLE `comuni`
  ADD CONSTRAINT `foregin_comuni_province` FOREIGN KEY (`provincia`) REFERENCES `province` (`codice`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Limiti per la tabella `province`
--
ALTER TABLE `province`
  ADD CONSTRAINT `foreign_province_regioni` FOREIGN KEY (`regione`) REFERENCES `regioni` (`nome`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
