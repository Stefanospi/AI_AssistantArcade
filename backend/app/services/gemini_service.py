# backend/app/services/gemini_service.py

import google.generativeai as genai
from typing import List, Optional, Dict 
from app.config import settings
from app.models.chat import ChatMessage, ChatRequest, ChatResponse 
import uuid
from datetime import datetime
import logging 

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        try:
            genai.configure(api_key=settings.google_api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            self.sessions: Dict[str, List[ChatMessage]] = {} 
            logger.info("GeminiService initializzato con successo.")
        except Exception as e:
            logger.error(f"Errore durante l'inizializzazione di GeminiService: {e}", exc_info=True)
            raise

    def get_system_prompt(self, tool_type: str, files_present: bool) -> str: # Aggiunto parametro files_present
        """Restituisce il prompt di sistema basato sul tipo di strumento e sulla presenza di file."""
        base_prompt = """
        Formatta sempre le tue risposte usando Markdown per una migliore leggibilità:
        - Usa ``` per blocchi di codice, specificando il linguaggio (es: ```python)
        - Usa `codice` per codice inline
        - Usa **grassetto** per evidenziare concetti importanti
        - Usa - per liste puntate
        - Usa ### per i titoli delle sezioni
        - Separa i concetti con righe vuote per migliorare la leggibilità.
        """

        file_instructions = ""
        if files_present:
            file_instructions = """
        ATTENZIONE: L'utente ha allegato uno o più file. La tua analisi e risposta DEVONO considerare PRIMARIAMENTE il contenuto di questi file.
        Fai riferimento esplicito ai nomi dei file quando discuti il loro contenuto.
        Se il messaggio dell'utente è generico (es. "leggi questo", "cosa ne pensi?"), la tua priorità è analizzare il contenuto dei file testuali forniti nella sezione 'Contenuto Dettagliato dei File Testuali' e rispondere in base a quello.
        """
        
        prompts = {
            "ask_assistant": f"""Sei un assistente AI all'interno di un cabinato arcade degli anni '80. 
                             Parla in modo amichevole ma tecnico. Usa riferimenti retro-gaming quando appropriato.
                             Aiuta gli sviluppatori con domande generali di programmazione.
                             {file_instructions} 
                             {base_prompt}""",
            
            "regex_builder": f"""Sei un esperto di espressioni regolari in un cabinato arcade.
                              Genera regex precise e spiega come funzionano. Fornisci esempi.
                              {file_instructions} Se ricevi codice o testo in un file, suggerisci regex appropriate basate sul suo contenuto.
                              {base_prompt}""",
            
            "code_fixer": f"""Sei un debugger arcade specializzato nel trovare e correggere bug.
                           Analizza il codice fornito (sia nel messaggio diretto che, soprattutto, nei file allegati presenti nella sezione 'Contenuto Dettagliato dei File Testuali').
                           Individua errori e suggerisci correzioni, spiegando il perché.
                           {file_instructions}
                           {base_prompt}""",
            
            "snippet_manager": f"""Sei un gestore di snippet di codice arcade.
                                Organizza e suggerisci snippet utili.
                                {file_instructions} Se ricevi codice in un file, aiuta a organizzarlo in snippet riutilizzabili o commentalo.
                                {base_prompt}""",
            
            "docs_explorer": f"""Sei un esploratore di documentazione arcade.
                              Trova e spiega documentazione. Fornisci esempi.
                              {file_instructions} Se ricevi codice in un file, identifica le librerie usate e fornisci documentazione pertinente.
                              {base_prompt}"""
        }
        selected_prompt = prompts.get(tool_type, prompts["ask_assistant"])
        # logger.info(f"System prompt per tool '{tool_type}' con files_present={files_present}:\n{selected_prompt}") # Logga il prompt completo se serve
        return selected_prompt

    async def chat(self, request: ChatRequest, files_data_received: Optional[List[Dict]] = None) -> ChatResponse:
        session_id = request.session_id or str(uuid.uuid4())
        
        try:
            # Determina se ci sono file PRIMA di ottenere il system prompt
            are_files_present_for_prompt = bool(files_data_received)
            system_prompt = self.get_system_prompt(request.tool_type, are_files_present_for_prompt)
            
            logger.info(f"Inizio processamento chat per session_id: {session_id}, tool: {request.tool_type}, files_present: {are_files_present_for_prompt}")

            file_processing_details_for_prompt = [] 
            processed_text_files_count = 0

            if files_data_received: # Riferisciti a files_data_received qui
                logger.info(f"Ricevuti {len(files_data_received)} file da processare.")
                file_processing_details_for_prompt.append("\n\n### File Caricati (Riepilogo):\n") # Titolo più chiaro
                
                contents_to_analyze_string_parts = []
                
                for idx, file_data in enumerate(files_data_received):
                    filename = file_data.get('filename', 'sconosciuto.bin')
                    content_bytes = file_data.get('content', b'')
                    content_type = file_data.get('content_type', 'application/octet-stream')

                    logger.info(f"--- Processando file {idx + 1}/{len(files_data_received)}: {filename} ---")
                    logger.info(f"Tipo contenuto ricevuto: {content_type}, Dimensione byte: {len(content_bytes)}")

                    current_file_summary = [f"\n{idx + 1}. **{filename}** (tipo: {content_type})"]

                    if not content_bytes:
                        logger.warning(f"File {filename} ha contenuto VUOTO (0 bytes).")
                        current_file_summary.append(" - VUOTO\n")
                        file_processing_details_for_prompt.extend(current_file_summary)
                        continue

                    is_text_file = False
                    file_ext = ('.' + filename.split('.')[-1].lower()) if '.' in filename else ''
                    
                    text_extensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.txt', '.md', '.html', '.css', '.scss', '.sass', '.xml', '.yaml', '.yml', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.sh', '.bat', '.sql', '.graphql', '.vue', '.svelte', '.conf', '.cfg', '.ini', '.env', '.toml', '.gradle', '.pom', '.dart', '.lua', '.r', '.m', '.mm']
                    text_content_types = ['text/', 'application/json', 'application/javascript', 'application/typescript', 'application/xml', 'application/yaml', 'application/x-python', 'application/x-sh', 'application/sql', 'application/x-yaml', 'application/toml', 'application/x-toml']

                    if any(ct in content_type.lower() for ct in text_content_types): is_text_file = True; logger.info(f"Identificato {filename} come TESTUALE da content_type.")
                    elif file_ext in text_extensions: is_text_file = True; logger.info(f"Identificato {filename} come TESTUALE da estensione.")
                    else:
                        try:
                            sample = content_bytes[:1000].decode('utf-8', errors='ignore') 
                            control_chars = sum(1 for c in sample if ord(c) < 32 and c not in '\n\r\t')
                            if control_chars < len(sample) * 0.1 : is_text_file = True; logger.info(f"Identificato {filename} come TESTUALE da analisi sample.")
                            else: logger.info(f"{filename} sembra BINARIO (troppi control chars su sample).")
                        except Exception: logger.info(f"{filename} sembra BINARIO (errore decodifica sample).")
                    
                    if is_text_file:
                        try:
                            decoded_content = content_bytes.decode('utf-8')
                            logger.info(f"{filename} decodificato (UTF-8). Lunghezza: {len(decoded_content)} chars.")
                            current_file_summary.append(f" - {len(decoded_content)} caratteri\n")
                            
                            preview_lines = decoded_content.split('\n')[:5] 
                            preview = '\n'.join(preview_lines)
                            if len(preview) > 200: preview = preview[:200] + '...'
                            current_file_summary.append(f"   - Anteprima:\n```{file_ext[1:] if file_ext else ''}\n{preview}\n```\n")
                            
                            analysis_content = decoded_content
                            file_content_limit = 30000 
                            if len(decoded_content) > file_content_limit: 
                                analysis_content = decoded_content[:file_content_limit]
                                logger.warning(f"Contenuto di {filename} troncato a {file_content_limit} caratteri (originale: {len(decoded_content)}).")
                            
                            # Aggiungi alla sezione dei contenuti dettagliati
                            contents_to_analyze_string_parts.append(f"\n\n#### Contenuto del File da Analizzare: {filename}\n") # Enfasi sul "da analizzare"
                            contents_to_analyze_string_parts.append(f"```{file_ext[1:] if file_ext else 'text'}\n")
                            contents_to_analyze_string_parts.append(analysis_content)
                            contents_to_analyze_string_parts.append(f"\n```")
                            if len(decoded_content) > file_content_limit:
                                contents_to_analyze_string_parts.append(f"\n_... (file {filename} troncato)_\n")
                            logger.info(f"Contenuto di {filename} aggiunto per l'analisi (lunghezza inviata: {len(analysis_content)}).")
                            processed_text_files_count += 1
                        except UnicodeDecodeError as e:
                            logger.error(f"ERRORE decodifica UTF-8 per {filename}: {e}. Trattato come binario.")
                            current_file_summary.append(f" - Errore decodifica UTF-8. File binario (presunto), {len(content_bytes)} byte\n")
                    else: 
                        logger.info(f"{filename} trattato come BINARIO.")
                        current_file_summary.append(f" - File binario, {len(content_bytes)} byte\n")
                        if content_type.startswith('image/'): current_file_summary.append(f"   - Tipo immagine: {content_type}\n")
                    
                    file_processing_details_for_prompt.extend(current_file_summary)

                if contents_to_analyze_string_parts: # Solo se ci sono contenuti testuali da analizzare
                    file_processing_details_for_prompt.append("\n\n### Contenuto Dettagliato dei File Testuali (DA ESAMINARE CON PRIORITÀ):\n") # Titolo più forte
                    file_processing_details_for_prompt.extend(contents_to_analyze_string_parts)
            else:
                logger.info("Nessun file ricevuto o processato.")

            # Assembla il prompt finale per Gemini
            prompt_parts_for_gemini = [system_prompt] # Il system_prompt ora include istruzioni sui file

            # Aggiungi la storia della conversazione
            if session_id in self.sessions:
                for msg in self.sessions[session_id]:
                    role_prefix = "Utente" if msg.role.lower() == "user" else "Assistente"
                    prompt_parts_for_gemini.append(f"\n\n{role_prefix}: {msg.content}")
            
            # Aggiungi i dettagli/contenuti dei file elaborati (se presenti)
            if file_processing_details_for_prompt: # Questo ora contiene il riepilogo E i contenuti dettagliati
                prompt_parts_for_gemini.append("".join(file_processing_details_for_prompt))

            # Aggiungi il messaggio utente corrente (originale, non modificato)
            prompt_parts_for_gemini.append(f"\n\nUtente: {request.message}") 
            final_prompt_string = "".join(prompt_parts_for_gemini)

            logger.info("--- PROMPT FINALE PER GEMINI (INIZIO) ---")
            max_log_chunk = 4000 
            for i in range(0, len(final_prompt_string), max_log_chunk):
                logger.info(final_prompt_string[i:i+max_log_chunk])
            logger.info(f"--- PROMPT FINALE PER GEMINI (FINE) --- Lunghezza totale: {len(final_prompt_string)} caratteri.")
            
            ai_response = self.model.generate_content(final_prompt_string)
            
            if session_id not in self.sessions: self.sessions[session_id] = []
            
            user_message_to_store = ChatMessage(role="user", content=request.message) # Salva il messaggio originale
            if files_data_received:
                filenames_str = ", ".join([fd.get('filename', 'sconosciuto') for fd in files_data_received])
                user_message_to_store.content += f"\n[File allegati: {filenames_str}]"
            self.sessions[session_id].append(user_message_to_store)
            
            self.sessions[session_id].append(
                ChatMessage(role="assistant", content=ai_response.text) # Assumendo che .text sia sempre presente
            )
            
            if len(self.sessions[session_id]) > 20: 
                self.sessions[session_id] = self.sessions[session_id][-20:]
            
            response_text_from_ai = ai_response.text if hasattr(ai_response, 'text') else ""
            if not response_text_from_ai and hasattr(ai_response, 'parts'): 
                 response_text_from_ai = "".join(part.text for part in ai_response.parts if hasattr(part, 'text'))

            logger.info(f"Risposta da Gemini ricevuta. Lunghezza: {len(response_text_from_ai)} caratteri.")
            return ChatResponse(
                response=response_text_from_ai,
                tool_type=request.tool_type,
                session_id=session_id
            )
            
        except Exception as e:
            import traceback
            error_detail = f"Errore Critico in GeminiService.chat: {str(e)}\nTraceback: {traceback.format_exc()}"
            logger.error(error_detail)
            return ChatResponse(
                response="",
                tool_type=request.tool_type,
                session_id=session_id, 
                error=f"Si è verificato un errore interno durante l'elaborazione della richiesta."
            )

gemini_service = GeminiService()