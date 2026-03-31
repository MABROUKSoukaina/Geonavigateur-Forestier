package com.ifn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Ifn2026Application {

	public static void main(String[] args) {
		SpringApplication.run(Ifn2026Application.class, args);
	}

}
