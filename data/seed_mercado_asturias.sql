--
-- PostgreSQL database dump
--

\restrict WsxFmGqpIp9DPOYO73Rlnw9RWdCuEwUjB9AQ2vCtZMJZtimGFhDAogK4p8fFnCQ

-- Dumped from database version 17.9 (Debian 17.9-0+deb13u1)
-- Dumped by pg_dump version 17.9 (Debian 17.9-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    descripcion text,
    icono character varying(10)
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: comercio_productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comercio_productos (
    comercio_id integer NOT NULL,
    producto_id integer NOT NULL
);


--
-- Name: comercios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comercios (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    descripcion text,
    direccion character varying(250),
    lat double precision,
    lon double precision,
    telefono character varying(20),
    web character varying(250),
    horario text,
    municipio_id integer NOT NULL,
    activo boolean,
    api_key character varying(64),
    created_at timestamp without time zone,
    suscripcion_hasta timestamp without time zone
);


--
-- Name: comercios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comercios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comercios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comercios_id_seq OWNED BY public.comercios.id;


--
-- Name: municipios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    lat double precision,
    lon double precision,
    provincia character varying(100)
);


--
-- Name: municipios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.municipios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: municipios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.municipios_id_seq OWNED BY public.municipios.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    descripcion text,
    imagen_url character varying(300),
    categoria_id integer NOT NULL
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: comercios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercios ALTER COLUMN id SET DEFAULT nextval('public.comercios_id_seq'::regclass);


--
-- Name: municipios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios ALTER COLUMN id SET DEFAULT nextval('public.municipios_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
a282ddaea493
\.


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias (id, nombre, slug, descripcion, icono) FROM stdin;
1	Gastro	gastro	Productos gastronómicos asturianos: quesos, embutidos, conservas...	🧀
2	Dulce	dulce	Repostería y dulces tradicionales	🍰
3	Sidra y Bebidas	sidra-bebidas	Sidra natural, vinos y otras bebidas locales	🍺
4	Artesanía	artesania	Productos artesanales y de diseño local	🎨
5	Huerta y Campo	huerta-campo	Frutas, verduras y productos de la tierra	🌿
\.


--
-- Data for Name: comercio_productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comercio_productos (comercio_id, producto_id) FROM stdin;
1	9
2	16
3	2
4	1
4	2
4	14
5	1
5	2
5	3
5	9
5	14
5	16
6	1
6	2
6	3
6	4
6	9
6	14
6	23
6	27
7	1
7	2
7	3
7	4
7	9
7	14
7	19
7	23
7	26
7	27
8	2
8	3
8	4
8	7
8	14
9	1
9	2
9	16
9	19
9	23
9	26
9	27
10	1
10	2
10	5
10	7
10	9
10	16
10	23
10	26
10	27
10	29
11	1
11	2
11	3
11	4
11	14
11	19
11	23
11	26
11	27
12	9
12	12
12	17
13	9
14	9
15	9
16	9
\.


--
-- Data for Name: comercios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comercios (id, nombre, slug, descripcion, direccion, lat, lon, telefono, web, horario, municipio_id, activo, api_key, created_at, suscripcion_hasta) FROM stdin;
2	Sr Lúpulo Despacho de Cervezas	sr-lupulo-despacho-de-cervezas	Establecimiento especializado en cervezas artesanas, con siete grifos de cerveza en rotación y más de 370 referencias para comprar o tomar en el local.	Calle San Antonio, 5	\N	\N	None	\N	Lunes a jueves de 12:00 a 14:30h de 17:00 a 22:30h \r\nViernes y sábados de 12:00 a 14:30h de 17:00 a 23:30h	1	t	54e22d8b4c913b60bfd91aa91d710b4cd64a3c23e2b6832a704f65948db79460	2026-03-03 09:14:47.24507	\N
3	Al Peso Bar	al-peso-bar	Al Peso, un bar que rinde homenaje a la tradición gastronómica de la región. En un ambiente acogedor, ofrecen tostas con los sabores más auténticos de Asturias. Desde la clásica tosta de queso Cabrales hasta opciones más creativas, cada bocado es un viaje culinario. Descubre también su selección de conservas asturianas, cuidadosamente elegidas para resaltar la riqueza de la región. En Al Peso, la calidad y la autenticidad se entrelazan para ofrecer una experiencia gastronómica que refleja la esencia misma de Asturias.\r\n\r\n	Calle Sta. Doradía, 19	43.5380737	-5.6568966	\N	\N	Lunes a sábado de 8:00 a 1:00h \r\nDomingos de 12:00 a 1:00h	1	t	1687ccc9ec9969c4342b6bf3edbecf0f0ccf15913f0f5eb8fa227f946789b08e	2026-03-05 13:23:11.87328	\N
4	La Marina	la-marina	Tienda de alimentación especialista en productos asturianos	Calle Martínez Marina, 6	43.358677	-5.8464754	984 39 96 00	\N	Lunes - Viernes: 9:00-14:00 / 17:45-20:00\r\nSábado: 9:30 - 14:30	1	t	5cead3c68f436c767d4776df7e89f00b1bcbdfc97ced62c99b9e1c8867061e5b	2026-03-18 09:49:52.289055	\N
5	Somiedo Productos Asturianos	somiedo-productos-asturianos	Comercio de productos asturianos	Calle San Bernardo, 4	43.5445012	-5.6625824	684 60 02 38	\N	Lunes - Viernes: 10:30 - 14:30 / 17:00 - 20:30\r\nSábado: 10:30 - 14:30\r\nDomingo: 10:30 - 15:00	1	t	f42534efc53d7e5b6cb17b1462a3a8314aa04f6405d71e210e1fee38ec46a3d1	2026-03-18 09:58:02.959497	\N
1	La Tienda Asturiana	la-tienda-asturiana-gijon	Especialistas en productos típicos de Asturias desde 1985	Calle Corrida, 12, Gijón	43.5453	-5.6615	985 000 000	https://ejemplo.com	Lun-Sáb 10:00-20:00	1	f	\N	2026-03-03 08:54:45.688045	\N
6	La Choricería	la-choriceria	Comercio de productos asturianos tanto de elaboración propia como de terceros.	Calle Juan Alvargonzález, 42	43.530001	-5.667225	\N	\N	Lunes - Sábado: 10:00 - 14:00	1	t	8390ed60a570c9bcf40c2da4dd49c063353132f5b5c15586f6233e7ee629f353	2026-03-18 10:47:43.469557	\N
7	La Esquina de Gijón	la-esquina-de-gijon	Tienda especializada en productos asturianos.	Calle Magnus Blikstad, 28	43.5393028	-5.6666512	\N	\N	Lunes - Viernes: 9:30 - 14:00 / 18:00 - 20:00\r\nSábado: 9:30 - 14:00	1	t	579bc2f4bd48f49d8f4ade55e346ebbce5f075299c41542c46b4f9f7e2f4230a	2026-03-18 10:59:04.879319	\N
8	Casa Marila	casa-marila	Tienda de alimentación	Calle Rio Muni, 4	43.5256441	-5.6682375	\N	\N	\N	1	t	d8a70816c3228105eade7e21d2f4b3ff1c12414406e2e1e8e6197bd5f8123d9b	2026-03-18 11:01:25.833797	\N
9	La Quesería	la-queseria	Tienda de productos lácteos	Calle Aguado, 32	43.5389674	-5.6489343	985 37 28 40	\N	\N	1	t	2cb0c3bd3f790d092a08b6decfea05840c523764c0a7885753a28f2685df94f5	2026-03-18 11:03:39.6993	\N
10	Comestibles la Gijonesa	comestibles-la-gijonesa	Tienda de alimentación	Calle Covadonga, 24, Gijón	43.5393173	-5.6603007	\N	\N	Lunes - Sábado: 11:00 - 20:30\r\nDomingo: 11:30 - 15:00	1	t	d879fcd41936c7813befac55759bbdda312624ba8faaca04e0b7166a52368ad3	2026-03-18 11:09:21.886131	\N
11	Quesería Cabrales 106	queseria-cabrales-106	Quesería. Tienda de productos lácteos.	Calle Cabrales, 106, Gijón	43.5357115	-5.6583378	None	\N	Lunes - Viernes: 10:00 - 14:00 / 17:30 - 20:30\r\nSábado: 10:30 - 14:30	1	t	39ab1af17e3e7fe9fff3f0c329c24c78e248b9e85e4125f7cb4d218687f014d9	2026-03-18 11:12:55.418673	\N
12	Llagar Castañón	llagar-castanon	Llagar de elaboración de sidra natural ubicado en Quintueles, Villaviciosa.	Carretera de San Miguel, 90-103, Quintueles(Villaviciosa)	43.511311	-5.5614577	\N	https://sidracastanon.com/	Según horario visitas guiadas.	10	t	013cae5dd0a18c52ff98414aaf2d11953f89b4b41f0dfcd69edf6b8d14b651e4	2026-03-18 11:19:23.603292	\N
13	Llagar Herminio	llagar-herminio	Llagar /sidrería	Camino Real, 11, Colloto	43.3761645	-5.8051006	\N	\N	\N	4	t	7ba187cc159a91278004be69667aadbeef5cc1b59f2e366c5f179d93da82c766	2026-03-18 11:24:21.164509	\N
14	Sidra Cortina	sidra-cortina	Bodega/Llagar 	San Juan, 44, Amandi, Villaviciosa	43.4673642	-5.4443893	\N	\N	\N	10	t	9232d6e16ba20c8b5a4e550724e80fccb0704970fe775c0a97c590bc62b4d7ec	2026-03-18 11:28:01.976208	\N
15	Sidra Menendez	sidra-menendez	Llagar de Sidra	Carretera AS-337, Fano, Gijón	43.4501105	-5.6226249	985 137 196	https://www.sidramenendez.com/	Lunes - Viernes: 9:00 - 14:00 / 16:00 - 19:30	1	t	ac50e19af746ed1752ed1d57f06fa525446cac867151c6d70beeb95dd627c316	2026-03-18 11:31:26.169512	\N
16	Sidra trabanco	sidra-trabanco	Llagar/Restaurante	Carretera de Lavandera, 3255, Gijón	43.4708624	-5.6457863	985 136 462	https://www.sidratrabanco.com/	Lunes - Miércoles: 12:00 - 18:00\r\nJueves - Sábado: 12:00 - 1:00\r\nDomingo: 12:00 - 18:00	1	t	7a6bfd17d6dcbd1fb6efee012af318a893268562ba675aba4bba10e66874fc62	2026-03-18 11:37:17.767345	\N
\.


--
-- Data for Name: municipios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.municipios (id, nombre, slug, lat, lon, provincia) FROM stdin;
1	Gijón	gijon	43.5453	-5.6615	Asturias
2	Oviedo	oviedo	43.3614	-5.8593	Asturias
3	Avilés	aviles	43.5547	-5.9248	Asturias
4	Siero	siero	43.3893	-5.6598	Asturias
5	Langreo	langreo	43.3003	-5.6866	Asturias
6	Mieres	mieres	43.2508	-5.7747	Asturias
7	Castrillón	castrillon	43.5661	-5.9986	Asturias
8	Carreño	carreno	43.5561	-5.7769	Asturias
9	Gozón	gozon	43.6122	-5.8328	Asturias
10	Villaviciosa	villaviciosa	43.4833	-5.4333	Asturias
11	Llanes	llanes	43.4199	-4.7549	Asturias
12	Cangas de Onís	cangas-de-onis	43.3508	-5.1294	Asturias
13	Tineo	tineo	43.3314	-6.4178	Asturias
14	Valdés	valdes	43.5667	-6.5167	Asturias
15	El Franco	el-franco	43.5667	-6.8333	Asturias
16	Tapia de Casariego	tapia-de-casariego	43.5667	-6.95	Asturias
17	Coaña	coana	43.5333	-6.7333	Asturias
18	Navia	navia	43.55	-6.7167	Asturias
19	Cudillero	cudillero	43.5622	-6.1483	Asturias
20	Muros de Nalón	muros-de-nalon	43.5383	-6.0758	Asturias
21	Pravia	pravia	43.4972	-6.1056	Asturias
22	Soto del Barco	soto-del-barco	43.5167	-6.05	Asturias
23	Corvera de Asturias	corvera-de-asturias	43.5525	-5.9839	Asturias
24	Llanera	llanera	43.4556	-5.8131	Asturias
25	Las Regueras	las-regueras	43.3833	-5.9167	Asturias
26	Santo Adriano	santo-adriano	43.3333	-5.9667	Asturias
27	Morcín	morcin	43.2833	-5.85	Asturias
28	Riosa	riosa	43.2667	-5.9	Asturias
29	Proaza	proaza	43.2667	-5.9833	Asturias
30	Teverga	teverga	43.25	-6.05	Asturias
31	Quirós	quiros	43.2667	-5.9833	Asturias
32	Lena	lena	43.15	-5.8167	Asturias
33	Aller	aller	43.1833	-5.6833	Asturias
34	Laviana	laviana	43.2333	-5.5667	Asturias
35	San Martín del Rey Aurelio	san-martin-del-rey-aurelio	43.2667	-5.6167	Asturias
36	Caso	caso	43.2	-5.4833	Asturias
37	Sobrescobio	sobrescobio	43.2333	-5.4667	Asturias
38	Ponga	ponga	43.2667	-5.1667	Asturias
39	Amieva	amieva	43.3	-5.1667	Asturias
40	Piloña	pilona	43.35	-5.4167	Asturias
41	Nava	nava	43.3667	-5.5	Asturias
42	Sariego	sariego	43.4	-5.5667	Asturias
43	Bimenes	bimenes	43.3333	-5.6167	Asturias
44	Cabranes	cabranes	43.4167	-5.5333	Asturias
45	Colunga	colunga	43.4833	-5.2833	Asturias
46	Caravia	caravia	43.45	-5.2167	Asturias
47	Ribadesella	ribadesella	43.4667	-5.0667	Asturias
48	Parres	parres	43.35	-5.2167	Asturias
49	Onís	onis	43.3167	-5.05	Asturias
50	Peñamellera Alta	penamellera-alta	43.3	-4.7333	Asturias
51	Peñamellera Baja	penamellera-baja	43.35	-4.65	Asturias
52	Ribadedeva	ribadedeva	43.3833	-4.5667	Asturias
53	Cobreces	cobreces	43.2167	-4.5167	Asturias
54	Cabrales	cabrales	43.2833	-4.8833	Asturias
55	Cangas del Narcea	cangas-del-narcea	43.1667	-6.55	Asturias
56	Degaña	degana	43.0667	-6.5167	Asturias
57	Ibias	ibias	43.0167	-6.7833	Asturias
58	Allande	allande	43.2333	-6.6167	Asturias
59	Grandas de Salime	grandas-de-salime	43.2167	-6.8667	Asturias
60	Pesoz	pesoz	43.2167	-6.9167	Asturias
61	San Martín de Oscos	san-martin-de-oscos	43.25	-7.05	Asturias
62	Santa Eulalia de Oscos	santa-eulalia-de-oscos	43.2333	-7.1167	Asturias
63	Villanueva de Oscos	villanueva-de-oscos	43.2833	-7.1	Asturias
64	Vegadeo	vegadeo	43.4667	-7.0333	Asturias
65	Taramundi	taramundi	43.3667	-7.1	Asturias
66	San Tirso de Abres	san-tirso-de-abres	43.4	-7.05	Asturias
67	Castropol	castropol	43.5167	-7.0333	Asturias
68	Boal	boal	43.45	-6.8333	Asturias
69	Illano	illano	43.3333	-6.9167	Asturias
70	Villayón	villayon	43.3667	-6.75	Asturias
71	Salas	salas	43.4167	-6.25	Asturias
72	Belmonte de Miranda	belmonte-de-miranda	43.2833	-6.25	Asturias
73	Grado	grado	43.3833	-6.0667	Asturias
74	Candamo	candamo	43.4333	-6.05	Asturias
75	Muñás de Arriba	munas-de-arriba	43.4333	-6.2	Asturias
76	Yernes y Tameza	yernes-y-tameza	43.2333	-6.05	Asturias
77	Miranda	miranda	43.45	-6.2167	Asturias
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.productos (id, nombre, slug, descripcion, imagen_url, categoria_id) FROM stdin;
1	Queso Afuega'l Pitu	queso-afuega-l-pitu	Queso tradicional asturiano de pasta blanda	\N	1
2	Queso Cabrales	queso-cabrales	Queso azul con denominación de origen protegida	\N	1
3	Chorizo asturiano	chorizo-asturiano	Embutido ahumado tradicional	\N	1
4	Morcilla asturiana	morcilla-asturiana	Morcilla tradicional con arroz y especias	\N	1
5	Conservas de bonito	conservas-de-bonito	Bonito del norte en aceite de oliva	\N	1
6	Carbayones	carbayones	Pastel típico de Oviedo con almendra y yema	\N	2
7	Casadielles	casadielles	Empanadilla frita rellena de nuez y anís	\N	2
8	Arroz con leche	arroz-con-leche	Postre tradicional asturiano gratinado	\N	2
9	Sidra natural	sidra-natural	Sidra asturiana sin gas, de manzana autóctona	\N	3
10	Sidra espumosa	sidra-espumosa	Sidra achampanada para ocasiones especiales	\N	3
11	Cerámica asturiana	ceramica-asturiana	Piezas de barro pintadas a mano	\N	4
12	Madera tallada	madera-tallada	Figuras y utensilios en madera de castaño	\N	4
13	Manzana asturiana	manzana-asturiana	Variedades autóctonas para sidra y mesa	\N	5
14	Faba asturiana	faba-asturiana	Legumbre con denominación de origen protegida	\N	5
15	Escanda	escanda	Cereal ancestral asturiano, sin gluten	\N	5
16	Cerveza Artesana	cerveza-artesana	\N	\N	3
17	cerámica	ceramica	\N	\N	4
18	Moscovitas	moscovitas	Dulce artesano a base de almendras, nata , harina y chocolate	\N	2
19	Queso Vidiago	queso-vidiago	Queso de leche vacuna elaborado en la localidad Llanisca de Vidiago.	\N	1
20	Aguardiente de Sidra	aguardiente-de-sidra	Producto destilado hecho a partir de la mejor selección de sidra asturiana, envejecido en barricas de roble.	\N	3
21	Licor de avellanas	licor-de-avellanas	\N	\N	3
22	Fabes verdinas	fabes-verdinas	Variedad gourmet de alubia pequeña, color verde esmeralda, considerada "manteca" por su textura dina al paladar.	\N	5
23	Queso tres leches de Pría	queso-tres-leches-de-pria	Queso elaborado con leche de vaca, cabra y oveja. Producido en la localidad de Pría (Llanes)	\N	1
24	Miel Abeja	miel-abeja	\N	\N	1
25	Anchoas	anchoas	\N	\N	1
26	Queso Casín	queso-casin	Queso elaborado en el concejo de Caso elaborado con leche entera y cruda de vaca.	\N	1
27	Queso la Peral	queso-la-peral	\N	\N	1
28	Carajitos  de avellana	carajitos-de-avellana	Pastel típico asturiano elaborado a base de avellanas.	\N	2
29	Marañueles	maranueles	\N	\N	2
\.


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categorias_id_seq', 5, true);


--
-- Name: comercios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comercios_id_seq', 16, true);


--
-- Name: municipios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.municipios_id_seq', 77, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.productos_id_seq', 29, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: comercio_productos comercio_productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercio_productos
    ADD CONSTRAINT comercio_productos_pkey PRIMARY KEY (comercio_id, producto_id);


--
-- Name: comercios comercios_api_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercios
    ADD CONSTRAINT comercios_api_key_key UNIQUE (api_key);


--
-- Name: comercios comercios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercios
    ADD CONSTRAINT comercios_pkey PRIMARY KEY (id);


--
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: ix_categorias_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_categorias_slug ON public.categorias USING btree (slug);


--
-- Name: ix_comercios_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_comercios_slug ON public.comercios USING btree (slug);


--
-- Name: ix_municipios_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_municipios_slug ON public.municipios USING btree (slug);


--
-- Name: ix_productos_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_productos_slug ON public.productos USING btree (slug);


--
-- Name: comercio_productos comercio_productos_comercio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercio_productos
    ADD CONSTRAINT comercio_productos_comercio_id_fkey FOREIGN KEY (comercio_id) REFERENCES public.comercios(id);


--
-- Name: comercio_productos comercio_productos_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercio_productos
    ADD CONSTRAINT comercio_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: comercios comercios_municipio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comercios
    ADD CONSTRAINT comercios_municipio_id_fkey FOREIGN KEY (municipio_id) REFERENCES public.municipios(id);


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- PostgreSQL database dump complete
--

\unrestrict WsxFmGqpIp9DPOYO73Rlnw9RWdCuEwUjB9AQ2vCtZMJZtimGFhDAogK4p8fFnCQ

