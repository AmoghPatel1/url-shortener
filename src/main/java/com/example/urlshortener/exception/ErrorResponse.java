package com.example.urlshortener.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;


//A dedicated error DTO instead of raw Map<String, Object>:
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)      // hides null fields (e.g. errors on 404/500)
public class ErrorResponse {

    private int status;
    private String error;
    private String message;
    private LocalDateTime timestamp;
    private Map<String, String> errors;         // only populated on 400 validation failures

}
