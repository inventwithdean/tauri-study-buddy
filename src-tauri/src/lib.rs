use base64::{engine::general_purpose, Engine as _};
use image::load_from_memory;
use paddle_ocr_rs::ocr_lite::OcrLite;
use std::sync::Mutex;
use tauri::path::BaseDirectory;
use tauri::Manager;
use tauri::RunEvent;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn process_image(base64_image: String, handle: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let image_bytes = general_purpose::STANDARD
            .decode(&base64_image)
            .map_err(|e| e.to_string())?;
        let img = load_from_memory(&image_bytes)
            .map_err(|e| e.to_string())?
            .to_rgb8();
        let mut ocr = OcrLite::new();
        let first_model_path = handle
            .path()
            .resolve(
                "ocr_models/ch_PP-OCRv5_mobile_det.onnx",
                BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?
            .display()
            .to_string();
        let second_model_path = handle
            .path()
            .resolve(
                "ocr_models/ch_ppocr_mobile_v2.0_cls_infer.onnx",
                BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?
            .display()
            .to_string();
        let third_model_path = handle
            .path()
            .resolve(
                "ocr_models/ch_PP-OCRv5_rec_mobile_infer.onnx",
                BaseDirectory::Resource,
            )
            .map_err(|e| e.to_string())?
            .display()
            .to_string();

        ocr.init_models(&first_model_path, &second_model_path, &third_model_path, 6)
            .map_err(|e| e.to_string())?;
        let res = ocr
            .detect(&img, 50, 1024, 0.5, 0.3, 1.6, true, false)
            .map_err(|e| e.to_string())?;
        let mut text = "".to_string();
        for item in res.text_blocks {
            // println!("text: {} score: {}", item.text, item.text_score);
            text.push_str(&format!("{} ", &item.text));
        }
        // println!("Extracted Text: ");
        // println!("{}", text);
        Ok(text)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(Option::<CommandChild>::None))
        .setup(|app| {
            // Only spawn once when the Tauri app launches
            let (mut _rx, child) = app
                .shell()
                .sidecar("llama-server")
                .expect("Failed to spawn sidecar")
                .args([
                    "-m",
                    "./model.gguf",
                    "--gpu-layers",
                    "100",
                    "--ctx-size",
                    "8000",
                ])
                .spawn()
                .expect("Failed to spawn llama-server sidecar");

            let state = app.state::<Mutex<Option<CommandChild>>>();
            *state.lock().unwrap() = Some(child);

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![process_image]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        RunEvent::ExitRequested { .. } => {
            let state = app_handle.state::<Mutex<Option<CommandChild>>>();
            let mut guard = state.lock().unwrap();
            if let Some(child) = guard.take() {
                let _ = child.kill();
            }
        }
        _ => {}
    });
}
