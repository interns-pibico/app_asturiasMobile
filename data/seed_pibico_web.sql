--
-- PostgreSQL database dump
--

\restrict QTK0IOnidLelYtAnYh179EqxHwBUDV28vqdqQtEWAG9OHWgDbbhJ858Lz72zpC4

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
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_categories (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(140) NOT NULL,
    description character varying(500),
    created_at timestamp without time zone NOT NULL
);


--
-- Name: blog_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_categories_id_seq OWNED BY public.blog_categories.id;


--
-- Name: blog_post_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_post_tags (
    post_id integer NOT NULL,
    tag_id integer NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id integer NOT NULL,
    title character varying(300) NOT NULL,
    slug character varying(320) NOT NULL,
    content text,
    excerpt character varying(500),
    author character varying(150),
    image_url character varying(500),
    category_id integer,
    lang character varying(5) NOT NULL,
    is_published boolean NOT NULL,
    published_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: blog_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_posts_id_seq OWNED BY public.blog_posts.id;


--
-- Name: blog_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_tags (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    slug character varying(100) NOT NULL
);


--
-- Name: blog_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blog_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blog_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blog_tags_id_seq OWNED BY public.blog_tags.id;


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(140) NOT NULL,
    description character varying(500),
    sort_order integer NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: product_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_categories_id_seq OWNED BY public.product_categories.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    tagline character varying(300),
    description text,
    features jsonb,
    sectors jsonb,
    validations jsonb,
    implementations jsonb,
    image_url character varying(500),
    demo_url character varying(500),
    category_id integer,
    is_active boolean NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    title character varying(250) NOT NULL,
    slug character varying(270) NOT NULL,
    description text,
    client_name character varying(200),
    image_url character varying(500),
    technologies jsonb,
    sector character varying(120),
    start_date date,
    end_date date,
    is_published boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    location character varying(200),
    short_description text,
    requirements jsonb,
    expected_results jsonb,
    photos jsonb
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    number character varying(4) NOT NULL,
    description character varying(500),
    icon_class character varying(80),
    sort_order integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description character varying(1000),
    icon_class character varying(80),
    category_id integer,
    sort_order integer NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: blog_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories ALTER COLUMN id SET DEFAULT nextval('public.blog_categories_id_seq'::regclass);


--
-- Name: blog_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts ALTER COLUMN id SET DEFAULT nextval('public.blog_posts_id_seq'::regclass);


--
-- Name: blog_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags ALTER COLUMN id SET DEFAULT nextval('public.blog_tags_id_seq'::regclass);


--
-- Name: product_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories ALTER COLUMN id SET DEFAULT nextval('public.product_categories_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
848b5ef6262e
\.


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_categories (id, name, slug, description, created_at) FROM stdin;
\.


--
-- Data for Name: blog_post_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_post_tags (post_id, tag_id) FROM stdin;
\.


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_posts (id, title, slug, content, excerpt, author, image_url, category_id, lang, is_published, published_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: blog_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_tags (id, name, slug) FROM stdin;
\.


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_categories (id, name, slug, description, sort_order, created_at) FROM stdin;
1	IoT	iot	\N	1	2026-02-06 14:16:04.845615
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, slug, tagline, description, features, sectors, validations, implementations, image_url, demo_url, category_id, is_active, sort_order, created_at, updated_at) FROM stdin;
1	PILoT	pilot	Processes with Internet or Localnet of Things	Solucion integral hardware + software disenada para PYMEs que integra dispositivos IoT industriales.	{"ai": "Mejora continua con IA explicable", "iot": "Integracion de sensores IoT industriales", "multi": "Multiusuario, multiempresa, multiidioma y multidivisa", "portal": "Portal web, tienda y portal de proveedores integrado", "offline": "Funciona en local sin conexion a Internet", "management": "Gestion documental, RRHH, materiales y equipos", "opensource": "Tecnologia open-source (Python, Web)"}	["Metalmecanico", "Construccion", "Agroalimentario", "Salud", "Reciclaje", "Maritimo", "Medioambiente"]	[{"icon": "fa-solid fa-mountain-sun", "title": "South Summit 2022", "description": "Presentacion del prototipo en Madrid"}, {"icon": "fa-solid fa-trophy", "title": "AT-Virtual Interreg", "description": "Ganador de los 3 Retos IoT Internacionales"}, {"icon": "fa-solid fa-award", "title": "IDEPA - SEKUENS - EBT 2021", "description": "Subvencion Empresa Base Tecnologica"}]	["Munster Technological University", "ENIDH Lisboa", "SASEMAR", "Mecanizados Gijon", "Leolia", "KRL", "Iquord", "Imasa", "Garciarama"]	/static/img/pilot/pilotBase.png	https://demo.pibico.es	1	t	1	2026-02-06 14:16:04.85101	\N
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, title, slug, description, client_name, image_url, technologies, sector, start_date, end_date, is_published, created_at, updated_at, location, short_description, requirements, expected_results, photos) FROM stdin;
1	SASEMAR FormaciON	sasemar-formacion	MVP de sistema MIoT para el programa AT~VIRTUAL (Interreg Atlantic Area). Plataforma FormaciON para mejorar la comunicación entre alumnos e instructores durante las prácticas de formación en Salvamento Marítimo. Incluye servidor web, broker MQTT, dispositivos físicos IoT personalizados (mesa, sala, busca) y mensajería multicanal (Telegram, SMS, email).	Salvamento Marítimo	/static/img/projects/sasemar-formacion.jpg	["MIoT", "PILoT", "MQTT", "Django", "PostgreSQL", "Raspberry Pi", "Telegram", "SMS", "FOSS"]	mIoT / Big Data / Interreg	2021-01-01	2021-06-30	t	2026-02-08 14:08:50.397148	2026-02-08 15:35:26.777681	Gijón, ES	Sistema MIoT de monitorización y envío de mensajes personalizados para prácticas de formación en rescate marítimo	["Multidispositivo con control de permisos de acceso", "Interfaz amigable para el usuario", "Mensajes fácilmente interpretables por alumnos o roles", "Funcionamiento con 50 usuarios simultáneos", "Plataforma abierta", "Visualización del estado de todos los dispositivos", "Autonomía suficiente para una jornada de formación"]	["App web servidor multidispositivo — FormaciON", "Broker privado MQTT", "Dispositivos portátiles autónomos personalizados", "Mensajes programados e instantáneos en sesiones", "Mensajes personalizados con luz, sonido y texto", "Stack FOSS para todos los componentes", "6 meses de hibridación a MVP"]	\N
2	SEGiTrack	segitrack	Plataforma de gestión y telemetría para flotas de vehículos eléctricos categoría-L (motos y scooters) en servicios de última milla. Dispositivo CCU (Connectivity Control Unit) con GNSS, IMU, acelerómetro, CAN bus y comunicaciones LTE. Dashboard web con geolocalización en tiempo real, detección de accidentes, conducción eficiente, geofencing, inmovilizador remoto y logs de trayectos.	SEG Automotive	/static/img/projects/segitrack.jpg	["EV", "LTE Cat-M1", "GNSS", "IMU", "CAN Bus", "BLE", "iButton", "PILoT", "FOSS", "Dashboard SEGiTrack"]	Flotas EV / IoT / Telemetría	2023-01-01	2023-12-31	t	2026-02-08 15:36:19.089951	\N	Cantabria	Plataforma de gestión y telemetría para flotas de vehículos eléctricos categoría-L en última milla	["Dispositivo IP67 instalable en vehículos categoría-L", "GNSS con IMU integrada y Dead Reckoning", "Conectividad LTE Cat-M1 y BLE", "Lectura de datos del vehículo por bus CAN", "Detección de accidentes, caídas y remolque", "Conducción eficiente (Green Driving) y límite de velocidad", "Geofencing e inmovilizador remoto con iButton", "Actualización FOTA y bajo consumo con batería backup"]	["Plataforma web SEGiTrack con mapa y dashboard", "Dispositivo CCU v0/v1 en caja Amphenol IP67", "Geolocalización en tiempo real con odómetro", "Escenarios configurables: crash, fall, towing, speed", "Tracking logs con registro de trayectos GNSS", "Identificación de conductores mediante iButton", "Stack FOSS para servidor y dashboard"]	\N
3	ZEN50 Smart Pilot	zen50-smart-pilot	Sistema de pilotaje inteligente para el catamarán solar ZEN50. Integración de datos mIoT, adquisición de señales de equipos eléctricos y eólicos, y navegación eficiente mediante analítica avanzada y Machine Learning.	Zen Yachts	/static/img/projects/zen50-smart-pilot.jpg	["mIoT", "Machine Learning", "NMEA2000", "NMEA0183", "MQTT", "WebSockets", "PILoT", "pibiDesk"]	mIoT / ML / Smart Pilot	2023-01-01	2023-12-31	t	2026-02-08 15:36:33.735426	\N	Naval	Sistema de pilotaje inteligente para el catamarán solar ZEN50	["Adquisición y control de datos de equipos eléctricos y eólicos", "Captura de datos de dispositivos auxiliares del barco", "Integración de datos capturados en un servidor central", "Intercambio de datos entre dispositivos core (viento y motores)", "Sensores I2C, N2K y NMEA0283, GPS, cámaras PoE+", "Protocolos de comunicación múltiples", "Monitorización de datos y registro en base de datos", "Analítica y Machine Learning para navegación eficiente"]	["App web servidor privado en cloud — pibiDocs", "App web de integración — pibiDesk Smart Pilot", "Dispositivos de captura de datos personalizados", "Lab de pruebas: I2C, NMEA2000, NMEA0183, MQTT, TCP, WebSockets", "Hardware industrial basado en PILoT"]	\N
4	Aquaculture mIoT	aquaculture-miot	Sistema de control automático de actividad y trazabilidad para piscifactorías trucheras (Astur Aquaculture). Dispositivos RFID personalizados (pibicoWork RFID) instalados en dos plantas de procesado en Caso y Lillo (Asturias). Sustitución de hojas Excel por captura digital de datos de empleados y producto en tiempo real, con aplicación web pibiDesk para gestión centralizada y permisos de acceso multidispositivo.	Astur Aquaculture	/static/img/projects/aquaculture-miot.jpg	["mIoT", "RFID", "pibicoWork", "pibiDesk", "PILoT", "FOSS"]	mIoT / Control & Trazabilidad	2021-01-01	2021-12-31	t	2026-02-08 15:37:17.658703	\N	Caso, Lillo, Asturias	Control automático de actividad de empleados y trazabilidad de producto en piscifactorías mediante dispositivos RFID personalizados	["Control automático de actividad de empleados", "Sustitución de hojas Excel manuales", "Trazabilidad completa de producto (pescado)", "Control mediante RFID (Radio Frequency Identification)", "Operación en dos instalaciones (Caso y Lillo)", "Multidispositivo con permisos de acceso controlados", "Hardware y software económicos"]	["App web servidor pibiDesk de gestión", "Dispositivos RFID personalizados (pibicoWork)", "Registro automático de actividad por empleado", "Trazabilidad digital de lotes de producto", "Despliegue en 2 plantas de procesado", "Stack FOSS para servidor y dashboard"]	\N
5	AIDuct Pro	aiduct-pro	Proyecto de transformación digital integral para Aislamientos Ainco, empresa de fabricación e instalación de conductos HVAC. La plataforma AIDuct Pro optimiza toda la cadena de valor — desde la recepción de peticiones de oferta hasta la entrega del producto final — incorporando IA para análisis de documentación técnica manuscrita, visión artificial para croquis, IoT para eficiencia energética, y Machine Learning para optimización de cortes y consumo de materiales. Proyecto financiado por el programa Activa Startups del Plan de Recuperación.	Aislamientos Ainco	/static/img/projects/aiduct-pro.jpg	["HVAC", "IA / ML", "Visión Artificial", "IoT", "PLN", "CNC", "FastAPI", "BPMN"]	Gestión / IA / HVAC	2024-01-01	2024-12-31	t	2026-02-08 15:37:17.658703	\N	Asturias	Transformación digital en fabricación e instalación de conductos HVAC con IA, IoT y Machine Learning	["Gestión integral desde presupuestos hasta entrega de conductos", "IA y visión artificial para análisis de croquis y documentación técnica", "Optimización de cortes CNC y reducción de mermas de material", "IoT para control de eficiencia energética de maquinaria", "Reconocimiento de voz y PLN para registro de actividad en taller y obra", "Eliminación del papel en el proceso productivo"]	["Plataforma AIDuct Pro con módulos de presupuestos, ventas, producción, HRM", "Integración CAD con IA para presupuestos y producción automáticos", "Inventario inteligente con consumo automático y control de recortes", "Control de actividad con voz, PLN y movilidad en obra", "Cuadros de mando para comercial, producción y RRHH", "4 fases completadas y 4 resultados clave alcanzados"]	\N
6	ENIDH Rescue Training	enidh-rescue-training	MVP de sistema mIoT para el programa AT~VIRTUAL (Interreg Atlantic Area). Innovación abierta para mejorar la respuesta en seguridad marítima. Mejora del manejo de embarcaciones menores y entrenamiento de rescate con sensores GPS e IMU en embarcaciones y dummy, integración de estación meteorológica y AIS, con visualización en mapa y dashboard en tiempo real.	ENIDH	/static/img/projects/enidh-rescue-training.jpg	["mIoT", "PILoT", "MQTT", "4G", "GPS", "IMU", "AIS", "pibiDesk", "FOSS"]	mIoT / Entrenamiento Rescate	2022-01-01	2022-12-31	t	2026-02-08 15:37:17.658703	\N	Lisboa, PT	Mejora del manejo de embarcaciones menores y entrenamiento de rescate para centros MSTC	["Sensores GPS e IMU en embarcaciones y dummy", "Integración de estación meteorológica y AIS existentes", "Posición de embarcaciones visualizada gráficamente en mapa", "Dashboard con información numérica", "Configurable por el usuario", "Preparado para dispositivos IoT futuros", "Menú para inicio/parada de grabación", "Registro para analítica e investigación"]	["App web servidor — pibiDesk ENIDH", "Web-apps locales multidispositivo 4G", "Broker privado MQTT", "Dispositivos portátiles autónomos personalizados", "Geolocalización y parámetros en tiempo real", "Stack FOSS para todos los componentes", "4 meses de hibridación a MVP"]	\N
7	MTU Smart Buoy	mtu-smart-buoy	MVP de boya inteligente con sensores ambientales para el programa AT~VIRTUAL (Interreg Atlantic Area). Innovación abierta para mejorar la respuesta en seguridad marítima en el Área Atlántica. Array de sensores de viento, agua y oleaje con conectividad inalámbrica y datos en tiempo real cada 30 segundos.	MTU	/static/img/projects/mtu-smart-buoy.jpg	["mIoT", "PILoT", "MQTT", "4G", "GPS", "LoRa", "Solar", "pibiDesk", "FOSS"]	mIoT / Sensores Ambientales	2022-01-01	2022-12-31	t	2026-02-08 15:37:17.658703	\N	Cork, IE	MVP de boya inteligente para centros de formación en seguridad marítima (MSTC)	["Sensores de viento, agua y oleaje en la boya", "Alimentación autosuficiente y conectividad inalámbrica", "Luz de señalización LED controlada remotamente", "Datos reportados mediante protocolo de mensajería", "Datos actualizados cada 30 segundos", "Multidispositivo con permisos de acceso controlados", "Hardware y software económicos", "Para uso en futuros proyectos de investigación"]	["App web servidor — pibiDesk MTU", "Web-app local multidispositivo 4G", "Broker privado MQTT", "Dispositivo flotante autónomo personalizado", "Geolocalización y parámetros en tiempo real", "Stack FOSS para todos los componentes", "5 meses de hibridación a MVP"]	\N
8	MineSentinel	minesentinel	Sistema integral de gestión ambiental para monitorización y control de vertidos de aguas en operaciones mineras. Gestión del ciclo completo desde la captura de datos en campo hasta la generación de informes regulatorios. Incluye gestión de masas de agua, puntos de ensayo con mapa interactivo, lecturas de caudal diarias con interfaz móvil, integración con dispositivos Zeus y generación automática de informes.	Hunosa	/static/img/projects/minesentinel.jpg	["mIoT", "Zeus API", "MQTT", "IA", "pibiDesk", "FOSS", "Ambiental"]	mIoT / Ambiental	2025-01-01	2025-12-31	t	2026-02-08 15:37:50.654211	\N	Asturias	Sistema integral de gestión ambiental para monitorización y control de vertidos de aguas en operaciones mineras	["Cumplimiento de normativa ambiental vigente", "Automatización de captura y procesado de datos de campo", "Generación de informes periódicos regulatorios", "Registro histórico completo de todos los vertidos", "Detección de anomalías e incumplimientos", "Optimización de la gestión documental"]	["Plataforma web MineSentinel de gestión de aguas", "Interfaz móvil para lecturas de caudal en campo", "Gestión de masas de agua y puntos de ensayo con mapa", "Integración con dispositivos Zeus (API)", "Generación automática de informes DOCX", "Extracción de datos con IA de documentos ambientales y ensayos de aguas", "Stack FOSS para servidor y dashboard"]	\N
9	EcoCustoDIA	ecocustodia	Proyecto de Innovación Industrial para la monitorización automática de biodiversidad mediante sensores AudioMoth en masas forestales. El sistema captura audio en campo y lo analiza con algoritmos de IA (BatDetect2 para murciélagos, BirdNET para aves) para detectar especies en tiempo real. Arquitectura IoT completa: sensores → MQTT → API Gateway → plataforma de visualización. Proyecto colaborativo financiado por SEKUENS (PID 2024).	pibiCo — Origen Solutions — Leolia Solutions	/static/img/projects/ecocustodia.jpg	["AudioMoth", "BatDetect2", "BirdNET", "FastAPI", "MQTT", "IoT", "RPi CM4", "Machine Learning"]	I+D / IA / Biodiversidad	2025-01-01	2025-12-31	t	2026-02-08 15:37:50.654211	\N	Asturias	Desarrollo de algoritmos avanzados para la monitorización, evaluación e información ambiental integrando IoT, IA y Visión Artificial	["Monitorización automática de fauna (aves y murciélagos)", "Captura de audio en campo con sensores AudioMoth", "APIs de IA para análisis de sonido en tiempo real", "Arquitectura IoT completa (sensor a plataforma)", "Interoperabilidad con ecosistema Leolia", "Cumplimiento de normativa ESRS de sostenibilidad"]	["BatSound API — detección de murciélagos con BatDetect2", "BirdSound API — identificación de aves con BirdNET (+6000 especies)", "Arquitectura IoT: AudioMoth → RPi CM4 → MQTT → FastAPI", "Validación en campo con precisión >89%", "TRL 7 alcanzado (prototipo operativo)", "Integración completa con plataforma Leolia"]	\N
10	Mobilytics	mobilytics	Plataforma digital avanzada GMAO (Gestión de Mantenimiento Asistido por Ordenador) para la gestión en movilidad de órdenes de trabajo de mantenimiento HVAC y sistemas contra incendios. Integra IA para transcripción de voz, mantenimiento predictivo e integración con ERP. Desarrollada para i-Lanza, empresa líder en proyectos EPC industriales y servicios de Facility Management a nivel nacional.	i-Lanza	/static/img/projects/mobilytics.jpg	["GMAO", "HVAC", "FastAPI", "IA / NLP", "Leaflet", "ERP", "App Móvil"]	GMAO / HVAC / IA	2025-01-01	2025-12-31	t	2026-02-08 15:37:50.654211	\N	Asturias	Plataforma GMAO móvil con IA para la gestión de mantenimiento HVAC y sistemas contra incendios	["Gestión de órdenes de trabajo en movilidad (web responsiva)", "Integración con ERP existente vía APIs", "Transcripción de voz a texto con IA (NLP)", "Mantenimiento predictivo con análisis de datos", "Trazabilidad completa de intervenciones con geoposición", "Reducción del 35% de tiempo administrativo de técnicos"]	["App Mobilytics AIoT de gestión de órdenes de trabajo", "6 módulos: Menú, Crear, Asignado, Pasadas, Hoja Trabajo, Gastos", "Mapas integrados con Leaflet y geolocalización", "Gestión de participantes y equipos de trabajo", "API REST sincronizada con ERP de i-Lanza", "Reducción del 30% en tiempo administrativo"]	\N
11	Maderas Camacho	maderas-camacho	Proyecto de transformación digital integral para Maderas Camacho SL, empresa de productos de madera, ferretería industrial y taller de carpintería. La plataforma PILoT con pibiGestor optimiza la gestión multicanal — tienda física, web, marketplace, taller y almacén — incorporando IA para reconocimiento de voz, OCR de documentos, inventario inteligente con trazabilidad RFID, y analítica predictiva para KPIs de negocio.	Maderas Camacho SL	/static/img/projects/maderas-camacho.jpg	["PILoT", "IA / ML", "OCR", "RFID", "REST API", "MariaDB", "Python", "Nginx"]	ERP / IA / Industria	2026-01-01	2026-12-31	t	2026-02-08 15:38:30.401902	\N	Asturias	Transformación digital en ferretería industrial, madera y carpintería con PILoT, IA y automatización	["Gestión multicanal de tienda física, web, marketplace, taller y almacén", "Control de transformaciones de madera con trazabilidad de recortes y mermas", "Presupuestos y obras con cálculo automático de materiales y costes", "Facturación Verifactu/SII y conexión con A3 contable", "IA: Voz y OCR para captura de datos en taller y obra", "Almacén automatizado con RFID, códigos de barras y stock en tiempo real"]	["Plataforma PILoT con 12 módulos: CRM, compras, inventario, HRM, obras, calidad", "Gestión de taller con flujos de transformación y productos terminados", "Integración marketplace y tienda online con TPV físico unificado", "Reconocimiento de voz para creación de pedidos y registros en movilidad", "Cuadros de mando con KPIs personalizados y analítica predictiva", "5 fases de implantación en 12 meses con formación continua"]	\N
12	CONSUMIA	consumia	Plataforma avanzada de optimización energética con IA explicable para PYMEs y usuarios residenciales. Combina una red distribuida de sensores IoT (Shelly con MQTT abierto), analítica predictiva con redes neuronales interpretables (LSTM, GRU, TCN con SHAP), y correlación con variables exógenas (meteorología, tarifas dinámicas, ocupación) para reducir el consumo energético un 15-25%.	pibiCo	/static/img/projects/consumia.jpg	["Shelly IoT", "Raspberry Pi CM4", "MQTT", "TensorFlow / Keras", "PyTorch", "SHAP", "InfluxDB", "MariaDB / Frappe", "ECharts", "Python", "Redis", "LoRaWAN"]	IA / Eficiencia Energética	2026-01-01	2026-12-31	t	2026-02-08 15:38:30.401902	\N	Asturias	Optimización energética inteligente con IA explicable y variables exógenas	["Arquitectura IoT híbrida con >1.000 dispositivos simultáneos, gateways Raspberry Pi CM4 y MQTT adaptativo", "IA Explicable con modelos LSTM/GRU/TCN, precisión >85% a 24h e interpretabilidad SHAP >75%", "Correlación de variables exógenas con APIs meteorológicas (AEMET, Copernicus), tarifas dinámicas y ocupación", "Detección predictiva de anomalías con Isolation Forest y autoencoders variacionales, falsos positivos <5%", "Dashboards adaptativos con Frappe/ECharts, almacenamiento híbrido InfluxDB + MariaDB y PWA responsive"]	["Plataforma CONSUMIA completa con IA explicable y red IoT distribuida", "Reducción del 15-25% del consumo energético con evidencia estadística significativa", "Tasa de aceptación >60% de recomendaciones por usuarios finales", "Solicitud de patente de algoritmos de IA explicable para eficiencia energética", "Reducción cuantificada de emisiones CO2 con certificación de impacto ambiental"]	\N
13	IoT Hub	iot-hub	Sistema IoT para monitorización en tiempo real de máquinas de soldadura. Retención local 36h, remota 7 días. Arquitectura distribuida con unidades CM4-IO-Wireless-Base Box autónomas. Cada unidad monitoriza parámetros de soldadura (corriente, voltaje, energía) mediante sensores Modbus/RS-485 con almacenamiento local en InfluxDB2.	Mefasa	/static/img/projects/iot-hub.jpg	["CM4-IO-Wireless-Base", "MQTT", "InfluxDB2", "Node-RED", "Modbus", "RS-485", "4G/LTE", "VPN", "PILoT"]	IoT / Soldadura / Industria	2026-01-01	2026-12-31	t	2026-02-08 15:38:30.401902	\N	Asturias	Sistema IoT para monitorización en tiempo real de máquinas de soldadura con retención local y remota	["Monitorización en tiempo real de parámetros de soldadura (corriente, voltaje, energía)", "Retención local 36h en cada unidad captadora y 7 días remoto en servidor pasarela", "Arquitectura híbrida con funcionamiento autónomo sin conectividad exterior", "Unidades captadoras autónomas por máquina con 4G/LTE y WiFi propio", "Acceso remoto mediante túneles VPN para administración y soporte"]	["Unidades CM4-IO-Wireless-Base Box con sensores Modbus/RS-485 e InfluxDB2 local, broker MQTT en VPS IoT Hub remoto", "Plataforma PILoT con pibiConnect para trazabilidad y gestión documental", "Dashboard de visualización en tiempo real accesible desde navegador web"]	\N
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_categories (id, name, number, description, icon_class, sort_order, is_active, created_at) FROM stdin;
1	Asesoria Empresarial	01	Consultoria estrategica y gestion empresarial	fa-solid fa-briefcase	1	t	2026-02-06 14:16:04.835657
2	Soluciones Tecnologicas	02	Desarrollo tecnologico y transformacion digital	fa-solid fa-microchip	2	t	2026-02-06 14:16:04.835947
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, title, description, icon_class, category_id, sort_order, is_active, created_at) FROM stdin;
1	Planificacion Estrategica	Definicion de objetivos y estrategias de crecimiento sostenible.	fa-solid fa-bullseye	1	1	t	2026-02-06 14:16:04.839685
2	Gestion de Conflictos	Mediacion y resolucion de conflictos empresariales y societarios.	fa-solid fa-handshake	1	2	t	2026-02-06 14:16:04.839935
3	Analisis Forense de Proyectos	Investigacion y diagnostico de proyectos fallidos o en crisis.	fa-solid fa-magnifying-glass-chart	1	3	t	2026-02-06 14:16:04.840193
4	Optimizacion de Procesos	Mejora continua de la eficiencia operativa.	fa-solid fa-chart-line	1	4	t	2026-02-06 14:16:04.840395
5	Desarrollo de Negocio	Estrategias de expansion y crecimiento empresarial.	fa-solid fa-rocket	1	5	t	2026-02-06 14:16:04.840561
6	Captacion de Clientes	Busqueda y adquisicion de nuevos clientes y oportunidades de negocio.	fa-solid fa-user-plus	1	6	t	2026-02-06 14:16:04.844578
7	Gestion Empresarial Integrada	Todas las herramientas de gestion en una unica plataforma unificada.	fa-solid fa-sitemap	2	1	t	2026-02-06 14:16:04.844818
8	Transformacion Digital	Modernizacion de sistemas y procesos empresariales.	fa-solid fa-digital-tachograph	2	2	t	2026-02-06 14:16:04.844998
9	IoT Industrial	Conectividad y automatizacion para la industria 4.0.	fa-solid fa-microchip	2	3	t	2026-02-06 14:16:04.845155
10	Inteligencia Artificial	Soluciones de IA aplicadas a problemas reales de negocio.	fa-solid fa-brain	2	4	t	2026-02-06 14:16:04.845305
11	Desarrollo a Medida	Software personalizado para necesidades especificas.	fa-solid fa-code	2	5	t	2026-02-06 14:16:04.845455
\.


--
-- Name: blog_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blog_categories_id_seq', 1, false);


--
-- Name: blog_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blog_posts_id_seq', 1, false);


--
-- Name: blog_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blog_tags_id_seq', 1, false);


--
-- Name: product_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_categories_id_seq', 1, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 1, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 13, true);


--
-- Name: service_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_categories_id_seq', 2, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 11, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: blog_categories pk_blog_categories; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT pk_blog_categories PRIMARY KEY (id);


--
-- Name: blog_post_tags pk_blog_post_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT pk_blog_post_tags PRIMARY KEY (post_id, tag_id);


--
-- Name: blog_posts pk_blog_posts; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT pk_blog_posts PRIMARY KEY (id);


--
-- Name: blog_tags pk_blog_tags; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_tags
    ADD CONSTRAINT pk_blog_tags PRIMARY KEY (id);


--
-- Name: product_categories pk_product_categories; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT pk_product_categories PRIMARY KEY (id);


--
-- Name: products pk_products; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT pk_products PRIMARY KEY (id);


--
-- Name: projects pk_projects; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT pk_projects PRIMARY KEY (id);


--
-- Name: service_categories pk_service_categories; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT pk_service_categories PRIMARY KEY (id);


--
-- Name: services pk_services; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT pk_services PRIMARY KEY (id);


--
-- Name: ix_blog_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_blog_categories_slug ON public.blog_categories USING btree (slug);


--
-- Name: ix_blog_posts_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_blog_posts_lang ON public.blog_posts USING btree (lang);


--
-- Name: ix_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: ix_blog_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_blog_tags_slug ON public.blog_tags USING btree (slug);


--
-- Name: ix_product_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_product_categories_slug ON public.product_categories USING btree (slug);


--
-- Name: ix_products_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_products_slug ON public.products USING btree (slug);


--
-- Name: ix_projects_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_projects_slug ON public.projects USING btree (slug);


--
-- Name: blog_post_tags fk_blog_post_tags_post_id_blog_posts; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT fk_blog_post_tags_post_id_blog_posts FOREIGN KEY (post_id) REFERENCES public.blog_posts(id);


--
-- Name: blog_post_tags fk_blog_post_tags_tag_id_blog_tags; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_tags
    ADD CONSTRAINT fk_blog_post_tags_tag_id_blog_tags FOREIGN KEY (tag_id) REFERENCES public.blog_tags(id);


--
-- Name: blog_posts fk_blog_posts_category_id_blog_categories; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT fk_blog_posts_category_id_blog_categories FOREIGN KEY (category_id) REFERENCES public.blog_categories(id);


--
-- Name: products fk_products_category_id_product_categories; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category_id_product_categories FOREIGN KEY (category_id) REFERENCES public.product_categories(id);


--
-- Name: services fk_services_category_id_service_categories; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT fk_services_category_id_service_categories FOREIGN KEY (category_id) REFERENCES public.service_categories(id);


--
-- PostgreSQL database dump complete
--

\unrestrict QTK0IOnidLelYtAnYh179EqxHwBUDV28vqdqQtEWAG9OHWgDbbhJ858Lz72zpC4

