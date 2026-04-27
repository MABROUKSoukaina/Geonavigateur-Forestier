package com.ifn.service;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages SSE connections and broadcasts "refresh" events to all connected browsers.
 */
@Component
public class RefreshNotifier {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(0L);          // no timeout
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(()    -> emitters.remove(emitter));
        emitter.onError(e       -> emitters.remove(emitter));
        // Send an immediate refresh so the browser reloads data after a service restart
        try {
            emitter.send(SseEmitter.event().name("refresh").data("reload"));
        } catch (IOException | IllegalStateException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    public void notifyRefresh() {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("refresh").data("reload"));
            } catch (IOException | IllegalStateException e) {
                emitters.remove(emitter);
            }
        }
    }
}
