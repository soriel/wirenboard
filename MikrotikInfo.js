// MikrotikInfo_routeros.js
// MQTT driver for MikroTik RouterOS device info
// In mikrotik create script
//# Required packages: iot

//################################ Configuration ################################
//# Name of an existing MQTT broker that should be used for publishing
//:local broker "wirenboard"

//# MQTT topic where the message should be published
//:local topic "mikrotik/routeros/info"

//#################################### System ###################################
//:put ("[*] Gathering system info...")
//:local identity [/system/identity/get name]
//:local cpuLoad [/system resource get cpu-load]
//:local freeMemory [/system resource get free-memory]
//:local usedMemory ([/system resource get total-memory] - $freeMemory)
//:local rosVersion [/system package get value-name=version [/system package find where name ~ "^routeros"]]
//:local model [/system routerboard get value-name=model]
//:local serialNumber [/system routerboard get value-name=serial-number]
//:local upTime [/system resource get uptime]
//:local mainWAN [/ip route get  value-name=comment number=[find where active=yes and dst-address=0.0.0.0/0 and routing-table=main]]
//#################################### MQTT #####################################
//:local message "{\"identity\":\"$identity\",\"model\":\"$model\",\"sn\":\"$serialNumber\",\"ros\":\"$rosVersion\",\"cpu\":$cpuLoad,\"umem\":$usedMemory,\"fmem\":$freeMemory,\"uptime\":\"$upTime\",\"mainWAN\":\"$mainWAN\"}"
//:log info "$message";
//:put ("[*] Total message size: $[:len $message] bytes")
//:put ("[*] Sending message to MQTT broker...")
///iot mqtt publish broker=$broker topic=$topic message=$message
//:put ("[*] Done")
//var deviceName = "mikrotik_router";
//var deviceModel = "routeros";
//var deviceAddr = "info";
//#################################### END SCRIPT #####################################
//#################################### MQTT brockers #####################################
// Use mqtt brokers
///iot mqtt brokers
//add address=192.168.177.3 name=wirenboard username=root

// Создаем виртуальное устройство
defineVirtualDevice(deviceName, {
    title: "MikroTik Router",
    cells: {
        // Идентификация устройства
        "identity": {
            type: "text",
            value: "",
            readonly: true
        },
        "model": {
            type: "text",
            value: "",
            readonly: true
        },
        "serial_number": {
            type: "text",
            value: "",
            readonly: true
        },
        
        // Версия RouterOS
        "ros_version": {
            type: "text",
            value: "",
            readonly: true
        },
        
        // Загрузка CPU
        "cpu_load": {
            type: "range",
            min: 0,
            max: 100,
            value: 0,
            readonly: true
        },
        
        // Использование памяти
        "used_memory": {
            type: "range",
            min: 0,
            max: 100,
            value: 0,
            readonly: true
        },
        "used_memory_mb": {
            type: "text",
            value: "",
            readonly: true
        },
        
        // Свободная память
        "free_memory": {
            type: "range",
            min: 0,
            max: 100,
            value: 0,
            readonly: true
        },
        "free_memory_mb": {
            type: "text",
            value: "",
            readonly: true
        },
        
        // Общая память
        "total_memory_mb": {
            type: "text",
            value: "",
            readonly: true
        },
        
        // Время работы
        "uptime": {
            type: "text",
            value: "",
            readonly: true
        },
        "uptime_seconds": {
            type: "range",
            min: 0,
            max: 100000000,
            value: 0,
            readonly: true
        },
        
        // Основной WAN интерфейс
        "main_wan": {
            type: "text",
            value: "",
            readonly: true
        },
        
        // Статус подключения
        "is_online": {
            type: "switch",
            value: false,
            readonly: true
        },
        
        // Время последнего обновления
        "last_update": {
            type: "text",
            value: "",
            readonly: true
        }
    }
});

// Преобразование времени работы из формата "HH:MM:SS" в секунды
function uptimeToSeconds(uptimeString) {
    try {
        var parts = uptimeString.split(':');
        if (parts.length === 3) {
            var hours = parseInt(parts[0]) || 0;
            var minutes = parseInt(parts[1]) || 0;
            var seconds = parseInt(parts[2]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        }
    } catch (e) {
        log("Error parsing uptime: " + e.toString());
    }
    return 0;
}

// Преобразование байтов в мегабайты
function bytesToMB(bytes) {
    return Math.round(bytes / (1024 * 1024));
}

// Расчет процента использования памяти
function calculateMemoryPercentage(usedMem, freeMem) {
    var total = usedMem + freeMem;
    if (total > 0) {
        return Math.round((usedMem / total) * 100);
    }
    return 0;
}

// ОСНОВНОЙ ОБРАБОТЧИК - получение данных из топика mikrotik/routeros/info
trackMqtt("mikrotik/routeros/info", function(message) {
    try {
        var data = JSON.parse(message.value);
        
        // Идентификация устройства
        dev[deviceName + "/identity"] = data.identity || "Неизвестно";
        dev[deviceName + "/model"] = data.model || "Неизвестно";
        dev[deviceName + "/serial_number"] = data.sn || "";
        
        // Версия RouterOS
        dev[deviceName + "/ros_version"] = data.ros || "";
        
        // Загрузка CPU
        var cpuLoad = parseInt(data.cpu) || 0;
        dev[deviceName + "/cpu_load"] = cpuLoad;
        
        // Использование памяти
        var usedMem = parseInt(data.umem) || 0;
        var freeMem = parseInt(data.fmem) || 0;
        
        // Конвертация в МБ
        var usedMemMB = bytesToMB(usedMem);
        var freeMemMB = bytesToMB(freeMem);
        var totalMemMB = usedMemMB + freeMemMB;
        
        // Установка значений
        dev[deviceName + "/used_memory_mb"] = usedMemMB + " MB";
        dev[deviceName + "/free_memory_mb"] = freeMemMB + " MB";
        dev[deviceName + "/total_memory_mb"] = totalMemMB + " MB";
        
        // Процент использования
        var usedPercent = calculateMemoryPercentage(usedMem, freeMem);
        var freePercent = 100 - usedPercent;
        
        dev[deviceName + "/used_memory"] = usedPercent;
        dev[deviceName + "/free_memory"] = freePercent;
        
        // Время работы
        var uptimeString = data.uptime || "00:00:00";
        dev[deviceName + "/uptime"] = uptimeString;
        dev[deviceName + "/uptime_seconds"] = uptimeToSeconds(uptimeString);
        
        // Основной WAN интерфейс
        dev[deviceName + "/main_wan"] = data.mainWAN || "";
        
        // Устройство онлайн
        dev[deviceName + "/is_online"] = true;
        
        // Время последнего обновления
        var now = new Date();
        dev[deviceName + "/last_update"] = now.toLocaleString();
        
        log("MikroTik data updated: " + data.identity + " - CPU: " + cpuLoad + "%, Mem: " + usedPercent + "%");
        
    } catch (e) {
        log("Error parsing MikroTik message: " + e.toString());
        log("Raw message: " + message.value);
    }
});

// Дополнительный топик для статуса онлайн (если MikroTik его публикует)
trackMqtt("mikrotik/routeros/online", function(message) {
    dev[deviceName + "/is_online"] = (message.value === "true" || message.value === "1");
});

// Топик для LWT (Last Will and Testament) - если устройство отключится
trackMqtt("mikrotik/routeros/status", function(message) {
    if (message.value === "offline") {
        dev[deviceName + "/is_online"] = false;
        log("MikroTik is offline");
    }
});

// Правило для периодической проверки состояния (опционально)
defineRule("check_mikrotik_status", {
    when: cron("@every 1m"),
    then: function() {
        // Можно добавить логику проверки, если данные не обновлялись давно
        var lastUpdate = dev[deviceName + "/last_update"];
        if (lastUpdate) {
            // Проверка, что данные не старше 5 минут
            var updateTime = new Date(lastUpdate);
            var currentTime = new Date();
            var diffMinutes = (currentTime - updateTime) / (1000 * 60);
            
            if (diffMinutes > 5) {
                dev[deviceName + "/is_online"] = false;
                log("MikroTik data is stale (" + diffMinutes.toFixed(0) + " minutes old)");
            }
        }
    }
});
