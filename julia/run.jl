import Solve
import JSON

function main()
  println("Listening at port "*ARGS[1])
  server = listen(ARGS[1])

  begin
    run = true
    while run
      sock = accept(server)
      println("Accepted connection.")
      while isopen(sock) && run
        line = readline(sock)
        if !isempty(line)
          command = JSON.parse(line)
          if command["type"] == "close"
            run = false
          else
            println("Running command...")
            result = run_command(command)
            println("Sending result...")
            write(sock,"[")
            JSON.print(sock,result)
            write(sock,"]\n")
          end
        end
      end
    end
  end
end

function run_command(command)
  try
    if command["type"] == "solve"
      Solve.solve_problem(command["problem"],command["prefs"])
    elseif command["type"] == "solvefile"
      prob = command["prob_file"]
      pref = command["pref_file"]
      newcommand = Dict("type" => "solve",
                     "problem" => JSON.parsefile(prob),
                     "prefs" => JSON.parsefile(pref))
      open(command["solution_file"],"w") do sol
        JSON.print(sol,run_command(newcommand))
      end
      Dict("result" => "saved")
    else
      Dict("result" => "error",
           "message" => "Unkonwn command type: "*command["type"])
    end
  catch e
    buffer = IOBuffer()
    showerror(buffer,e,catch_backtrace())
	estr = takebuf_string(buffer)
	println(estr)
    Dict("result" => "error",
         "message" => "Exception thrown: \n"*estr)
  end
end

prob = "/Users/davidlittle/Desktop/TA2016_17.json"
pref = "data/prefs.json"

function run_solver(prob,pref,solutionfile)
  open(solutionfile,"w") do sol
    command = Dict("type" => "solve",
                   "problem" => JSON.parsefile(prob),
                   "prefs" => JSON.parsefile(pref))
    JSON.print(sol,run_command(command))
  end
end
